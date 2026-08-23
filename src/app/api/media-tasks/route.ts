import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin, hasSectionRead } from "@/lib/permissions";

// Lists every ProjectTask with needsMedia=true across ALL projects.
// Status updates from this Kanban hit /api/project-tasks/[id] PATCH which
// updates the same row — so the social/educational/etc. project Kanban and
// the media Kanban stay in sync automatically.

export async function GET(_: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Visible to ADMIN, anyone with MEDIA section read, or anyone with maktab read
  if (!isAdmin(session.user.roles) && !(await hasSectionRead(session, "MEDIA"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.projectTask.findMany({
    where: { needsMedia: true },
    include: {
      project: { select: { id: true, name: true, section: true, status: true } },
      assignees: { include: { member: { select: { id: true, fullName: true } } } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks);
}
