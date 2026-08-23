import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FamilyLinksManager } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    redirect("/unauthorized");
  }

  const [adults, childrenProp, links] = await Promise.all([
    prisma.member.findMany({
      where: { memberType: "ADULT", isActive: true },
      select: { id: true, fullName: true, registrationNumber: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.member.findMany({
      where: { memberType: "CHILD", isActive: true },
      select: { id: true, fullName: true, registrationNumber: true, fatherName: true, motherName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.familyLink.findMany({
      include: {
        parent: { select: { id: true, fullName: true, registrationNumber: true } },
        child: { select: { id: true, fullName: true, registrationNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <FamilyLinksManager adults={adults} childOptions={childrenProp} initialLinks={links} />;
}
