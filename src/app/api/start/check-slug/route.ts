import { NextRequest, NextResponse } from "next/server";
import { control, RESERVED_SLUGS } from "@/lib/tenants";
import { rateLimit } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;

function ipFor(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown"
  );
}

export async function GET(req: NextRequest) {
  // 10/min per IP — tight enough that a tenant-enumeration bot is expensive
  // but loose enough for a UX form to validate-as-you-type.
  if (!rateLimit(`slug-check:${ipFor(req)}`, 10, 60 * 1000).allowed) {
    return NextResponse.json({ error: "too many" }, { status: 429 });
  }
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase() ?? "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, reason: "reserved" });
  }
  const taken = await control.tenant.findUnique({ where: { slug }, select: { id: true } });
  return NextResponse.json({ available: !taken, reason: taken ? "taken" : null });
}
