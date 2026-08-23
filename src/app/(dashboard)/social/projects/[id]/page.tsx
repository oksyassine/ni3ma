import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectDetailClient } from "./client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const adults = await prisma.member.findMany({
    where: { isActive: true, memberType: "ADULT" },
    select: { id: true, fullName: true, registrationNumber: true },
    orderBy: { fullName: "asc" },
  });

  return <ProjectDetailClient projectId={id} adults={adults} />;
}
