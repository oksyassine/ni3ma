// Outbound message provider abstraction. Pluggable so the bureau can wire
// any local SMS/WhatsApp provider (EnvoiSMS, Wakil, Twilio, Meta Cloud) without
// code changes — just env vars. Falls back to a no-op "test" provider that
// records every message into the messages_out table, which the bureau can
// inspect at /bureau/messages.

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export type MessageChannel = "WHATSAPP" | "SMS" | "EMAIL";

export interface SendRequest {
  to: string;
  body: string;
  channel: MessageChannel;
  templateKey?: string;
  variables?: Record<string, string | number>;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  cost?: number; // MAD
}

interface Provider {
  name: string;
  send(req: SendRequest): Promise<SendResult>;
}

// --- Test / dev provider: just records into the DB and reports success.
class TestProvider implements Provider {
  name = "test";
  async send(_req: SendRequest): Promise<SendResult> {
    // Sleep a tiny bit to make the queued→sent transition visible in UI.
    await new Promise((r) => setTimeout(r, 50));
    return { ok: true, providerMessageId: `test-${Date.now()}`, cost: 0 };
  }
}

// --- HTTP provider: generic webhook. Used for any real Moroccan provider
// that exposes a simple POST endpoint (EnvoiSMS.ma, Wakil.ma, custom).
class HttpProvider implements Provider {
  constructor(
    public name: string,
    private url: string,
    private authToken?: string,
    private defaultChannel: MessageChannel = "WHATSAPP"
  ) {}
  async send(req: SendRequest): Promise<SendResult> {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        },
        body: JSON.stringify({
          to: req.to,
          body: req.body,
          channel: req.channel,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      const data: { id?: string; cost?: number; error?: string } = await res.json().catch(() => ({}));
      return { ok: true, providerMessageId: data.id, cost: data.cost };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "send failed" };
    }
  }
}

// --- EnvoiSMS.ma: the leading Moroccan SMS/WhatsApp gateway.
//   Docs: https://www.envoisms.ma/api-documentation
//   - SMS:    POST {base}/sms/send with `phone` + `message` → returns { id, cost }
//   - WABA:    POST {base}/waba/send with `phone` + `message` → returns { id, cost }
// Pricing (2026): ~0.55 MAD/WhatsApp, ~0.48 MAD/SMS to Moroccan numbers.
// Auth: Authorization: Bearer <ENVOISMS_TOKEN>
class EnvoiSmsProvider implements Provider {
  name = "envoisms";
  constructor(
    private token: string,
    private baseUrl = "https://api.envoisms.ma/v1",
    private defaultChannel: MessageChannel = "WHATSAPP"
  ) {}

  async send(req: SendRequest): Promise<SendResult> {
    const channel = req.channel === "EMAIL" ? this.defaultChannel : req.channel;
    const path = channel === "WHATSAPP" ? "/waba/send" : "/sms/send";
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          phone: req.to.replace(/[^\d+]/g, ""), // E.164-ish
          message: req.body,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json().catch(() => ({} as { id?: string; cost?: number; error?: string; message?: string }));
      if (!res.ok || data.error) {
        return {
          ok: false,
          error: String(data.error ?? data.message ?? `HTTP ${res.status}`),
        };
      }
      return {
        ok: true,
        providerMessageId: String(data.id ?? ""),
        cost: typeof data.cost === "number" ? data.cost : undefined,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "envoisms send failed" };
    }
  }
}

// --- Meta WhatsApp Business Cloud API: the canonical provider for
//   any tenant with a verified Meta Business Account + phone number ID.
//   Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text
class WabaCloudProvider implements Provider {
  name = "waba-cloud";
  constructor(
    private phoneNumberId: string,
    private accessToken: string,
    private apiVersion = "v20.0"
  ) {}

  async send(req: SendRequest): Promise<SendResult> {
    if (req.channel !== "WHATSAPP") {
      return { ok: false, error: `WABA Cloud cannot send ${req.channel}` };
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: req.to.replace(/[^\d+]/g, ""),
            type: "text",
            text: { body: req.body },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const data = await res.json().catch(() => ({} as { messages?: { id: string }[]; error?: { message: string } }));
      if (!res.ok || data.error) {
        return {
          ok: false,
          error: String(data.error?.message ?? `HTTP ${res.status}`),
        };
      }
      const providerMessageId = data.messages?.[0]?.id;
      // Meta charges per-conversation, not per-message. Cost is computed
      // asynchronously in our reconciliation; we leave it null here.
      return { ok: true, providerMessageId, cost: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "waba-cloud send failed" };
    }
  }
}

let cached: Provider | null = null;

export function loadProvider(): Provider {
  if (cached) return cached;
  // Provider order: explicit env > test
  const env = process.env.MESSAGE_PROVIDER;
  if (env === "envoisms") {
    const token = process.env.ENVOISMS_TOKEN;
    if (token) {
      cached = new EnvoiSmsProvider(
        token,
        process.env.ENVOISMS_BASE_URL,
        (process.env.ENVOISMS_DEFAULT_CHANNEL as MessageChannel) || "WHATSAPP",
      );
      return cached;
    }
  }
  if (env === "waba-cloud" || env === "waba") {
    const phoneId = process.env.WABA_PHONE_NUMBER_ID;
    const accessToken = process.env.WABA_ACCESS_TOKEN;
    if (phoneId && accessToken) {
      cached = new WabaCloudProvider(
        phoneId,
        accessToken,
        process.env.WABA_API_VERSION,
      );
      return cached;
    }
  }
  if (env === "http") {
    const url = process.env.MESSAGE_PROVIDER_URL;
    if (url) {
      cached = new HttpProvider(
        "http",
        url,
        process.env.MESSAGE_PROVIDER_TOKEN,
        (process.env.MESSAGE_PROVIDER_DEFAULT_CHANNEL as MessageChannel) || "WHATSAPP",
      );
      return cached;
    }
  }
  cached = new TestProvider();
  return cached;
}

// Render a template's body with {varName} placeholders. Missing variables
// are left as empty strings.
export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

export async function enqueueAndSend(args: {
  channel: MessageChannel;
  to: string;
  body: string;
  templateKey?: string;
  variables?: Record<string, string | number>;
  recipientMemberId?: string;
  recipientName?: string;
  cost?: number;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const provider = loadProvider();
  // Persist first with status QUEUED so a crash mid-send still leaves a record.
  const queued = await prisma.messageOut.create({
    data: {
      channel: args.channel,
      recipientPhone: args.to,
      recipientMemberId: args.recipientMemberId ?? null,
      recipientName: args.recipientName ?? null,
      templateKey: args.templateKey ?? null,
      variables: args.variables
        ? (args.variables as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      body: args.body,
      status: "QUEUED",
      provider: provider.name,
    },
  });
  const result = await provider.send({
    to: args.to,
    body: args.body,
    channel: args.channel,
    templateKey: args.templateKey,
    variables: args.variables,
  });
  await prisma.messageOut.update({
    where: { id: queued.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      providerMessageId: result.providerMessageId ?? null,
      error: result.error ?? null,
      cost: result.cost ?? null,
      sentAt: result.ok ? new Date() : null,
    },
  });
  return { ok: result.ok, error: result.error, messageId: queued.id };
}
