import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageGovernance } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

// POST /api/elections — create a new election (DRAFT).
// Also accepts the legacy form-encoded POST from the list page.

const electionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  electionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seats: z.number().int().min(1).max(15).default(7),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`election:${session.user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  let body: unknown;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    body = Object.fromEntries(form.entries());
  }

  const parsed = electionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const { title, electionDate, seats } = parsed.data;

  const election = await prisma.election.create({
    data: {
      title,
      electionDate: new Date(electionDate),
      seats,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "election",
    entityId: election.id,
    after: { title, electionDate, seats },
    req,
  });

  // Form-encoded → redirect back to the list; JSON → return id.
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, id: election.id });
  }
  return NextResponse.redirect(new URL("/bureau/elections", req.url), { status: 303 });
}
