import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// Provision (or repair) a tenant database end-to-end:
//   1. CREATE DATABASE if the server allows it
//   2. prisma db push to sync the schema
//   3. bootstrap seed (admin + association info + annual programs)
//   4. mark the tenant ACTIVE in the registry
//
// Usage:  npx tsx scripts/provision-tenant.ts <slug> [--reset-admin NEWPASS]
// Idempotent — safe to re-run after failures.

const [, , slugArg, , newPass] = process.argv;
if (!slugArg || !/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/.test(slugArg)) {
  console.error("Usage: npx tsx scripts/provision-tenant.ts <slug> [--reset-admin NEWPASS]");
  process.exit(1);
}

const control = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } });

async function main() {
  const tenant = await control.tenant.findUnique({ where: { slug: slugArg } });
  if (!tenant) throw new Error(`Tenant "${slugArg}" not found in registry`);
  const dbUrl = tenant.dbUrl;

  // 1. Try to create the database ourselves
  const dbName = new URL(dbUrl).pathname.slice(1);
  try {
    await control.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database ${dbName}`);
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    if (/already exists|42P04/.test(msg)) console.log(`Database ${dbName} already exists`);
    else console.warn(`Could not CREATE DATABASE (${msg.trim()}). Create it via cPanel, then re-run.`);
  }

  // 2. Sync schema via Prisma CLI against the tenant DB
  console.log("Syncing schema (prisma db push)...");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  // 3. Bootstrap data
  const { bootstrapTenant } = await import("../src/lib/bootstrap");
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const existingAdmin = await client.user.findFirst({ select: { username: true } });
  const password = newPass ?? randomStrongPass();
  await bootstrapTenant(client, {
    associationName: tenant.name,
    city: tenant.city,
    adminName: tenant.contactName ?? "المدير",
    adminUsername: existingAdmin?.username ?? slugToUsername(slugArg),
    adminPasswordHash: await hash(password, 12),
  });
  await client.$disconnect();

  if (!newPass) {
    // Print only when WE generated the password. The operator must capture
    // it and deliver to the tenant admin out-of-band; there's no other way
    // to retrieve it.
    console.warn(`\n*** TEMPORARY ADMIN PASSWORD for "${slugArg}" ***`);
    console.warn(`    ${password}`);
    console.warn(`    (deliver this securely, then ask the admin to rotate it)\n`);
  }

  // 4. Mark ACTIVE
  await control.tenant.update({
    where: { id: tenant.id },
    data: { status: "ACTIVE", provisionedAt: new Date(), lastProvisionError: null },
  });
  console.log(`Tenant "${slugArg}" is ACTIVE → https://${slugArg}.${process.env.ROOT_DOMAIN ?? "?"}/login`);
}

function slugToUsername(s: string): string {
  return "admin_" + s.replace(/-/g, "_").slice(0, 20);
}

// 24 base64url chars = 18 bytes = 144 bits of entropy. Distinct character
// set from the bcrypt alphabet so the printed password is unambiguous in
// any terminal. Operator copies this once at deploy time.
function randomStrongPass(): string {
  return randomBytes(18).toString("base64url");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => control.$disconnect());
