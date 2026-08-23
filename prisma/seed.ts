import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { bootstrapTenant } from "../src/lib/bootstrap";

// Local-dev seed for the PRIMARY database. For provisioning new tenants use
// scripts/provision-tenant.ts instead.

const prisma = new PrismaClient();

async function main() {
  const { adminId } = await bootstrapTenant(prisma, {
    associationName: "جمعية النعمة",
    city: "مكناس",
    adminName: "المدير العام",
    adminUsername: "admin",
    adminPasswordHash: hashSync("admin123", 12),
    facebookUrl: "https://www.facebook.com/neimaa15/",
  });
  console.log("Admin user ready:", adminId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
