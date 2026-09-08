import { createHmac, timingSafeEqual } from "node:crypto";

// YouCan Pay server-to-server integration, following the official PHP SDK
// (github.com/youcan-shop/youcan-payment-php-sdk):
//
// - API base:   https://youcanpay.com/api/        (live)
//               https://youcanpay.com/sandbox/api/ (sandbox)
// - Tokenize:   POST {base}tokenize
//               { pri_key, amount, currency, order_id, success_url,
//                 error_url, customer_ip, customer?, metadata? }
//               → 200 { token: { id } }
// - Pay URL:    https://youcanpay.com/{sandbox/}payment-form/{tokenId}?lang=ar
// - Webhook:    signature header = HMAC-SHA256 hex of the raw JSON body,
//               keyed with the private key. Compare with timing-safe equal.
// - Events:     "transaction.success", "transaction.failed", ...

const PRIVATE_KEY = process.env.YOUCAN_PAY_PRIVATE_KEY ?? "";
const SANDBOX = (process.env.YOUCAN_PAY_MODE ?? "sandbox") !== "live";

// 5s timeout for tokenize calls — a hung YouCan can't pin an event-loop
// thread or pile up requests on a cPanel worker.
const TOKENIZE_TIMEOUT_MS = 5_000;

// Allowlist for `lang` parameter on the payment-form URL. Anything outside
// this set is replaced with the safe default — defends against URL-injection
// when a malicious caller passes `lang` into the URL builder.
const SAFE_LANGS = new Set(["ar", "fr", "en"]);

export function youcanPayConfigured(): boolean {
  return PRIVATE_KEY.startsWith("pri_") && PRIVATE_KEY.length > 8;
}

function apiBase(): string {
  return `https://youcanpay.com/${SANDBOX ? "sandbox/api/" : "api/"}`;
}

export function paymentFormUrl(tokenId: string, lang = "ar"): string {
  const safeLang = SAFE_LANGS.has(lang) ? lang : "ar";
  return `https://youcanpay.com/${SANDBOX ? "sandbox/" : ""}payment-form/${tokenId}?lang=${safeLang}`;
}

export type TokenizeInput = {
  orderId: string;
  /** Amount in MAD — YouCan expects a decimal string like "99.00". */
  amountMad: number;
  successUrl: string;
  errorUrl: string;
  customerIp: string;
  customer?: { name?: string; email?: string; phone?: string };
  metadata?: Record<string, string>;
};

export type TokenizeResult =
  | { ok: true; tokenId: string }
  | { ok: false; message: string };

// Strip the platform's own private key from any error text returned by the
// gateway (or by us) so a developer reading logs doesn't accidentally leak
// the credential via an echo from YouCan.
function sanitizeMessage(msg: string): string {
  if (!msg) return msg;
  return msg
    .replace(/pri_[A-Za-z0-9_]+/g, "[REDACTED]")
    .replace(/pri-test_[A-Za-z0-9_]+/g, "[REDACTED]");
}

export async function tokenize(input: TokenizeInput): Promise<TokenizeResult> {
  if (!youcanPayConfigured()) {
    return { ok: false, message: "YouCan Pay keys are not configured" };
  }
  const body = {
    pri_key: PRIVATE_KEY,
    amount: input.amountMad.toFixed(2),
    currency: "MAD",
    order_id: input.orderId,
    success_url: input.successUrl,
    error_url: input.errorUrl,
    customer_ip: input.customerIp,
    customer: input.customer ?? {},
    metadata: input.metadata ?? {},
  };

  try {
    const res = await fetch(`${apiBase()}tokenize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TOKENIZE_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => ({}))) as {
      token?: { id?: string };
      message?: string;
    };
    if (res.ok && json.token?.id) {
      return { ok: true, tokenId: json.token.id };
    }
    return { ok: false, message: sanitizeMessage(json.message ?? `YouCan Pay error (HTTP ${res.status})`) };
  } catch (err) {
    return { ok: false, message: sanitizeMessage(String(err instanceof Error ? err.message : err)) };
  }
}

/**
 * Verify a webhook signature against the raw request body (HMAC-SHA256).
 *
 * The signature header is normalized before comparison: whitespace stripped,
 * lowercase, and any non-hex characters rejected. Without this, a signature
 * like `"ab cd ef"` or `"abCDef"` short-circuits `timingSafeEqual`'s
 * length check and bypasses the comparison.
 */
export function verifyWebhookSignature(signature: string | null, rawBody: string): boolean {
  if (!signature || !PRIVATE_KEY) return false;
  const normalized = signature.trim().toLowerCase().replace(/\s+/g, "");
  if (!/^[0-9a-f]+$/.test(normalized)) return false;
  const expected = createHmac("sha256", PRIVATE_KEY).update(rawBody).digest("hex");
  if (normalized.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(normalized, "utf8"), Buffer.from(expected, "utf8"));
}

export type YouCanWebhookEvent = {
  event_id?: number | string;
  event_name?: string;
  payload?: {
    transaction?: {
      id?: string;
      order_id?: string;
      metadata?: Record<string, string>;
      [k: string]: unknown;
    };
  };
};

export function parseWebhookEvent(rawBody: string): YouCanWebhookEvent | null {
  try {
    return JSON.parse(rawBody) as YouCanWebhookEvent;
  } catch {
    return null;
  }
}
