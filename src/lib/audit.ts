import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
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

function toJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  // Decimal/Date/etc → string-safe via JSON round-trip
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const ip = input.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? input.req?.headers.get("x-real-ip")
      ?? null;
    const userAgent = input.req?.headers.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: toJson(input.before),
        after: toJson(input.after),
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Never break the request if audit logging fails
    console.error("audit log failed", err);
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
