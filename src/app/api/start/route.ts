import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { control, RESERVED_SLUGS, buildTenantDbUrl, getClientForDbUrl, rootDomain } from "@/lib/tenants";
import { rateLimit } from "@/lib/rate-limit";
import { bootstrapTenant } from "@/lib/bootstrap";
import { splitSqlStatements } from "@/lib/sql-split";

// Slug rules: 3–30 chars, lowercase alnum + hyphen, no leading/trailing hyphen.
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;
const PHONE_RE = /^\+?\d[\d\s-]{4,29}$/;

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).optional(),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE),
  adminName: z.string().trim().min(2).max(80),
  adminUsername: z.string().trim().regex(USERNAME_RE),
  // 8+ chars with at least one of each class — weak passwords rejected.
  adminPassword: z.string()
    .min(8).max(72)
    .refine((s) => /[a-z]/.test(s) && /[A-Z\u0600-\u06FF]/.test(s) && /\d/.test(s),
      { message: "weak password" }),
  phone: z.string().trim().regex(PHONE_RE).optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  if (!rateLimit(`start:${ip}`, 5, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "محاولات كثيرة، أعد المحاولة بعد ساعة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }
  const data = parsed.data;

  if (RESERVED_SLUGS.has(data.slug)) {
    return NextResponse.json({ error: "هذا الاسم محجوز، اختر اسما آخر" }, { status: 409 });
  }

  const dbUrl = buildTenantDbUrl(data.slug);
  let tenant: { id: string; slug: string };
  try {
    tenant = await control.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        city: data.city || null,
        plan: "FREE",
        status: "PENDING_PROVISIONING",
        dbUrl,
        contactName: data.adminName,
        contactPhone: data.phone || null,
        contactEmail: data.email || null,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      select: { id: true, slug: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "هذا العنوان مأخوذ بالفعل" }, { status: 409 });
    }
    return NextResponse.json({ error: "تعذر إنشاء الفضاء، أعد المحاولة" }, { status: 500 });
  }

  // Best-effort inline provisioning. On cPanel Postgres the DB user often
  // lacks CREATEDB — in that case the tenant stays PENDING_PROVISIONING and
  // `scripts/provision-tenant.ts <slug>` finishes the job.
  let provisioned = false;
  try {
    await provision(tenant.slug);
    provisioned = true;
  } catch (err) {
    await control.tenant.update({
      where: { id: tenant.id },
      data: { lastProvisionError: String(err instanceof Error ? err.message : err).slice(0, 500) },
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    status: provisioned ? "ACTIVE" : "PENDING_PROVISIONING",
    loginUrl: provisioned ? `https://${tenant.slug}.${rootDomain()}/login` : null,
  });

  async function provision(slug: string) {
    const dbName = new URL(dbUrl).pathname.slice(1);
    try {
      await control.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      if (!/already exists|42P04/.test(msg)) throw err;
    }
    const client = getClientForDbUrl(dbUrl);
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const ddlPath = path.join(process.cwd(), "prisma", "tenant-template.sql");
    const ddl = readFileSync(ddlPath, "utf8");
    for (const stmt of splitSqlStatements(ddl)) {
      if (stmt) await client.$executeRawUnsafe(stmt);
    }
    await bootstrapTenant(client, {
      associationName: data.name,
      city: data.city,
      adminName: data.adminName,
      adminUsername: data.adminUsername.toLowerCase(),
      adminPasswordHash: await hash(data.adminPassword, 12),
    });
    await control.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE", provisionedAt: new Date(), lastProvisionError: null },
    });
  }
}
