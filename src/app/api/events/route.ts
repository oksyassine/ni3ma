import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageGovernance } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(4000),
  slug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, "invalid slug"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  venue: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  ticketPrice: z.number().nonnegative().default(0),
  paymentMode: z.enum(["FREE", "ONLINE", "ONSITE"]).default("FREE"),
  memberDiscountPct: z.number().min(0).max(100).default(50),
  visibility: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`event-create:${session.user.id}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const data = parsed.data;

  // Slug uniqueness is enforced by the @unique; we still try/catch the
  // P2002 to return a clean 409.
  try {
    const event = await prisma.event.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : new Date(new Date(data.startsAt).getTime() + 4 * 60 * 60 * 1000),
        venue: data.venue ?? null,
        city: data.city ?? null,
        capacity: data.capacity ?? null,
        ticketPrice: new Prisma.Decimal(data.ticketPrice),
        memberDiscountPct: new Prisma.Decimal(data.memberDiscountPct),
        paymentMode: data.paymentMode,
        visibility: data.visibility,
        createdBy: session.user.id,
      },
      select: { id: true },
    });
    await recordAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "event",
      entityId: event.id,
      after: { title: data.title, slug: data.slug },
      req,
    });
    return NextResponse.json({ id: event.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "slug already taken" }, { status: 409 });
    }
    throw e;
  }
}
