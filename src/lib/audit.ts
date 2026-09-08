import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { control } from "./tenants";
import type { AuditAction } from "@prisma/client";


type AuditInput = {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  req?: NextRequest;
};

// Field names that must never appear in audit logs. These end up in the
// tenant DB's audit_logs table — readable by anyone with SELECT on that
// table, so storing hashes / tokens / secrets there is a credential
// goldmine waiting to be dumped.
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "passwordConfirm",
  "oldPassword",
  "newPassword",
  "currentPassword",
  "token",
  "tokenId",
  "refreshToken",
  "accessToken",
  "apiKey",
  "secret",
  "clientSecret",
  "checkinToken",
  "sessionToken",
  "cookie",
  "authorization",
  "bankRib",
  "rib",
  "iban",
  "cnssNumber",
  "grossSalary",
  "netSalary",
  "taxId",
]);

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return "[Circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v, seen);
    }
  }
  return out;
}

function safeJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  const redacted = redact(v);
  return JSON.parse(JSON.stringify(redacted)) as Prisma.InputJsonValue;
}

function ipFromReq(req?: NextRequest): string | null {
  if (!req) return null;
  return (
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? null
  );
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const ip = ipFromReq(input.req);
  const userAgent = input.req?.headers.get("user-agent") ?? null;
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: safeJson(input.before),
        after: safeJson(input.after),
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Audit failures are surfaced to logs AND the control-plane audit log
    // (which lives in the platform DB, not the tenant DB). The request
    // itself is NOT failed — we already wrote the business change — but
    // the absence of audit is a regulatory concern for financial entities.
    const errMsg = String(err instanceof Error ? err.message : err);
    console.error("[AUDIT FAILURE]", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      userId: input.userId,
      ip,
      err: errMsg,
    });
    try {
      await control.platformAuditLog.create({
        data: {
          action: "AUDIT_FAILURE",
          entity: input.entity,
          entityId: input.entityId ?? null,
          ip,
          meta: {
            originalAction: input.action,
            originalUserId: input.userId ?? null,
            error: errMsg.slice(0, 500),
          },
        },
      });
    } catch {
      // Control DB also unavailable — at least the stderr log captured it.
    }
  }
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  APPROVE: "اعتماد",
  REJECT: "رفض",
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  PUBLISH: "نشر",
  SKIP: "تخطّي",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  member: "منخرط",
  contribution: "مساهمة",
  expense: "مصروف",
  donation: "تبرع",
  academic_year: "سنة دراسية",
  program: "برنامج",
  activity: "نشاط",
  attendance: "حضور",
  quran_progress: "تقدم قرآني",
  volunteer_hours: "ساعات تطوع",
  family_link: "ربط عائلي",
  user: "مستخدم",
};
