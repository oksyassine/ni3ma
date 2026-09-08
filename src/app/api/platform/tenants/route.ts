import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { control, normalizeHost, rootDomain, getClientForDbUrl, invalidateTenant } from "@/lib/tenants";
import { headers } from "next/headers";
import { splitSqlStatements } from "@/lib/sql-split";

// Platform-owner tenant management. Host must be the root domain and the
// session must carry ADMIN (platform DB admin). Proxy already restricts
// /platform to ADMIN; this re-checks for defense in depth.

async function assertPlatformAdmin() {
  const session = await auth();
  if (!session) return null;
  const h = await headers();
  const host = normalizeHost(h.get("host"));
  // `endsWith` without the leading dot accepts `evilneimaa.carbtrim.online`
  // and `x.neimaa.carbtrim.online.attacker.com` — both are not on our
  // root domain. Require the leading dot to anchor the suffix.
  if (!host || !host.endsWith("." + rootDomain())) return null;
  if (!(session.user.roles as string[]).includes("ADMIN")) return null;
  return session;
}

async function logPlatformAction(input: {
  session: { user: { id: string } };
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await control.platformAuditLog.create({
      data: {
        actor: input.session.user.id,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ip: input.ip ?? null,
        meta: (input.meta ?? {}) as never,
      },
    });
  } catch (err) {
    console.error("[platform audit] failed", err);
  }
}

const patchSchema = z.object({
  tenantId: z.string().trim().regex(/^c[a-z0-9]{20,28}$/i, "invalid tenantId"),
  action: z.enum(["activate", "suspend", "retry-provision"]),
});

export async function GET() {
  if (!(await assertPlatformAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenants = await control.tenant.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ tenants });
}

export async function PATCH(req: NextRequest) {
  const session = await assertPlatformAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { tenantId, action } = parsed.data;

  const tenant = await control.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "الفضاء غير موجود" }, { status: 404 });

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  let provisionError: string | null = null;

  switch (action) {
    case "activate": {
      // Manual activation by the platform owner (e.g. after a bank transfer).
      const before = { status: tenant.status };
      await control.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE", lastProvisionError: null },
      });
      // Invalidate the per-host cache so the tenant becomes routable
      // immediately (default TTL is 30s otherwise).
      invalidateTenant(tenant.slug + "." + rootDomain());
      await logPlatformAction({
        session,
        action: "tenant.activate",
        entity: "tenant",
        entityId: tenantId,
        ip,
        meta: { before },
      });
      break;
    }
    case "suspend": {
      const before = { status: tenant.status };
      await control.tenant.update({
        where: { id: tenantId },
        data: { status: "SUSPENDED" },
      });
      invalidateTenant(tenant.slug + "." + rootDomain());
      await logPlatformAction({
        session,
        action: "tenant.suspend",
        entity: "tenant",
        entityId: tenantId,
        ip,
        meta: { before },
      });
      break;
    }
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
        const path = await import("node:path");
        const { readFileSync } = await import("node:fs");
        const ddlPath = path.join(process.cwd(), "prisma", "tenant-template.sql");
        const ddl = readFileSync(ddlPath, "utf8");
        // Use the proper statement splitter that handles DO blocks, string
        // literals, and dollar-quoted function bodies — plain `;`-split
        // corrupts any future migration with PL/pgSQL.
        for (const stmt of splitSqlStatements(ddl)) {
          if (stmt) await client.$executeRawUnsafe(stmt);
        }
        const hasData = await client.user.findFirst({ select: { id: true } });
        if (!hasData) {
          // No bootstrap yet — seed a placeholder admin the owner must reset.
          // The placeholder is created INACTIVE and gets a strong 24-char
          // random password printed to stderr + platform audit log so the
          // platform owner can deliver it to the tenant admin out-of-band.
          const { bootstrapTenant } = await import("@/lib/bootstrap");
          const { hash } = await import("bcryptjs");
          const { randomBytes } = await import("node:crypto");
          const tempPassword = randomBytes(18).toString("base64url");
          await bootstrapTenant(client, {
            associationName: tenant.name,
            city: tenant.city,
            adminName: tenant.contactName ?? "المدير",
            adminUsername: "admin_" + tenant.slug.replace(/-/g, "_").slice(0, 20),
            adminPasswordHash: await hash(tempPassword, 12),
            adminIsActive: false, // force platform owner to enable after delivery
          });
          console.warn(`[provision] tenant=${tenant.slug} temp admin password (deliver out-of-band): ${tempPassword}`);
          await logPlatformAction({
            session,
            action: "tenant.provision.bootstrap",
            entity: "tenant",
            entityId: tenantId,
            ip,
            meta: { passwordDelivered: false, note: "see server stderr for temp password" },
          });
        }
        await control.tenant.update({
          where: { id: tenantId },
          data: { status: "ACTIVE", provisionedAt: new Date(), lastProvisionError: null },
        });
        invalidateTenant(tenant.slug + "." + rootDomain());
        await logPlatformAction({
          session,
          action: "tenant.provision.success",
          entity: "tenant",
          entityId: tenantId,
          ip,
        });
      } catch (err) {
        provisionError = String(err instanceof Error ? err.message : err).slice(0, 500);
        await control.tenant.update({
          where: { id: tenantId },
          data: { status: "PROVISION_FAILED", lastProvisionError: provisionError },
        }).catch(() => {});
        await logPlatformAction({
          session,
          action: "tenant.provision.failure",
          entity: "tenant",
          entityId: tenantId,
          ip,
          meta: { error: provisionError },
        });
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
