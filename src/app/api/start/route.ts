import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { control, RESERVED_SLUGS, buildTenantDbUrl, getClientForDbUrl, rootDomain } from "@/lib/tenants";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { bootstrapTenant } from "@/lib/bootstrap";

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).optional(),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE),
  adminName: z.string().trim().min(2).max(80),
  adminUsername: z.string().trim().regex(USERNAME_RE),
  adminPassword: z.string().min(8).max(72),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
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

  // Slug uniqueness at platform level (usernames are per-tenant-DB, no
  // cross-tenant constraint needed).
  const slugTaken = await control.tenant.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (slugTaken) {
    return NextResponse.json({ error: "هذا العنوان مأخوذ بالفعل" }, { status: 409 });
  }

  const dbUrl = buildTenantDbUrl(data.slug);
  let tenant: { id: string; slug: string };
  try {
    tenant = await control.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        city: data.city,
        plan: "FREE",
        status: "PENDING_PROVISIONING",
        dbUrl,
        contactName: data.adminName,
        contactPhone: data.phone,
        contactEmail: data.email,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      select: { id: true, slug: true },
    });
  } catch {
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
    // 1. Create database if missing
    try {
      await control.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      if (!/already exists|42P04/.test(msg)) throw err;
    }
    // 2. Apply schema DDL from the committed template dump
    const client = getClientForDbUrl(dbUrl);
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const ddlPath = path.join(process.cwd(), "prisma", "tenant-template.sql");
    const ddl = readFileSync(ddlPath, "utf8");
    // The template dump contains plain DDL (no functions/triggers), so a
    // simple semicolon split is safe. Comment-only fragments are skipped.
    for (const stmt of ddl.split(";")) {
      const s = stmt
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
      if (s) await client.$executeRawUnsafe(s);
    }
    // 3. Seed bootstrap data
    await bootstrapTenant(client, {
      associationName: data.name,
      city: data.city,
      adminName: data.adminName,
      adminUsername: data.adminUsername.toLowerCase(),
      adminPasswordHash: await hash(data.adminPassword, 12),
    });
    await client.$disconnect();
    // 4. Mark ACTIVE
    await control.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE", provisionedAt: new Date(), lastProvisionError: null },
    });
  }
}
