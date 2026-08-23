import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { control, normalizeHost, rootDomain, getClientForDbUrl } from "@/lib/tenants";
import { headers } from "next/headers";

// Platform-owner tenant management. Host must be the root domain and the
// session must carry ADMIN (platform DB admin). Proxy already restricts
// /platform to ADMIN; this re-checks for defense in depth.

async function assertPlatformAdmin() {
  const session = await auth();
  if (!session) return null;
  const h = await headers();
  const host = normalizeHost(h.get("host"));
  if (!host || !host.endsWith(rootDomain())) return null;
  if (!(session.user.roles as string[]).includes("ADMIN")) return null;
  return session;
}

const patchSchema = z.object({
  tenantId: z.string().min(1),
  action: z.enum(["activate", "suspend", "retry-provision"]),
});

export async function GET() {
  if (!(await assertPlatformAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenants = await control.tenant.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ tenants });
}

export async function PATCH(req: NextRequest) {
  if (!(await assertPlatformAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { tenantId, action } = parsed.data;

  const tenant = await control.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "الفضاء غير موجود" }, { status: 404 });

  let provisionError: string | null = null;

  switch (action) {
    case "activate":
      // Manual activation by the platform owner (e.g. after a bank transfer).
      await control.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE", lastProvisionError: null },
      });
      break;
    case "suspend":
      await control.tenant.update({
        where: { id: tenantId },
        data: { status: "SUSPENDED" },
      });
      break;
    case "retry-provision": {
      // Best-effort inline provisioning; on cPanel without CREATEDB the CLI
      // script remains the fallback.
      try {
        const dbName = new URL(tenant.dbUrl).pathname.slice(1);
        try {
          await control.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
        } catch (err) {
          const msg = String(err instanceof Error ? err.message : err);
          if (!/already exists|42P04/.test(msg)) throw err;
        }
        const client = getClientForDbUrl(tenant.dbUrl);
        const ddlPath = await import("node:path");
        const { readFileSync } = await import("node:fs");
        const ddl = readFileSync(ddlPath.join(process.cwd(), "prisma", "tenant-template.sql"), "utf8");
        for (const stmt of ddl.split(";")) {
          const s = stmt.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim();
          if (s) await client.$executeRawUnsafe(s);
        }
        const hasData = await client.user.findFirst({ select: { id: true } });
        if (!hasData) {
          // No bootstrap yet — seed a placeholder admin the owner must reset.
          const { bootstrapTenant } = await import("@/lib/bootstrap");
          const { hash } = await import("bcryptjs");
          await bootstrapTenant(client, {
            associationName: tenant.name,
            city: tenant.city,
            adminName: tenant.contactName ?? "المدير",
            adminUsername: "admin_" + tenant.slug.replace(/-/g, "_").slice(0, 20),
            adminPasswordHash: await hash(crypto.randomUUID().slice(0, 12), 12),
          });
        }
        await client.$disconnect();
        await control.tenant.update({
          where: { id: tenantId },
          data: { status: "ACTIVE", provisionedAt: new Date(), lastProvisionError: null },
        });
      } catch (err) {
        provisionError = String(err instanceof Error ? err.message : err).slice(0, 500);
        await control.tenant.update({
          where: { id: tenantId },
          data: { status: "PROVISION_FAILED", lastProvisionError: provisionError },
        }).catch(() => {});
      }
      break;
    }
  }

  const updated = await control.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, plan: true, currentPeriodEnd: true, lastProvisionError: true, trialEndsAt: true },
  });
  if (provisionError && !updated?.lastProvisionError) {
    return NextResponse.json({ tenant: updated, warning: provisionError }, { status: 200 });
  }
  return NextResponse.json({ tenant: updated });
}
