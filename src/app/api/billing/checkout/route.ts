import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { control, getTenantContext, normalizeHost } from "@/lib/tenants";
import { PLANS } from "@/lib/plans";
import { tokenize, youcanPayConfigured, paymentFormUrl } from "@/lib/payments/youcan";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { hasBureauRead } from "@/lib/permissions";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO"]),
  months: z.union([z.literal(1), z.literal(12)]),
  payerName: z.string().trim().min(2).max(80).optional(),
  payerEmail: z.string().trim().email().max(120).optional(),
  payerPhone: z.string().trim().max(30).optional(),
});

// Annual prepay = pay for 10 months.
function priceFor(planKey: keyof typeof PLANS, months: number): number {
  const monthly = PLANS[planKey].priceMad;
  return months === 12 ? monthly * 10 : monthly;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getTenantContext();
  if (!tenant) {
    return NextResponse.json(
      { error: "الاشتراك المدفوع متاح فقط لفضاءات الجمعيات (نطاق فرعي خاص)" },
      { status: 400 }
    );
  }

  // Defense-in-depth: a JWT is signed with NEXTAUTH_SECRET (global), so a
  // user logged in to tenant A could technically POST this endpoint while
  // presenting `Host: tenantB.example.com`. Require that the calling user
  // actually be an ADMIN of this tenant, or a maktab member with billing
  // rights (BUREAU/BUREAU_RW/FINANCIAL).
  const isAdminUser = session.user.roles.includes("ADMIN");
  const isMaktab = session.user.roles.includes("BUREAU")
    || session.user.roles.includes("BUREAU_RW")
    || session.user.roles.includes("FINANCIAL");
  if (!isAdminUser && !isMaktab && !(await hasBureauRead(session))) {
    return NextResponse.json(
      { error: "هذه العملية متاحة للمكتب فقط" },
      { status: 403 },
    );
  }

  // Throttle to 5/min per session — bulk-creating PENDING rows would fill
  // the tenant_payments table and burn YouCan API quota.
  const rl = rateLimit(`checkout:${session.user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "طلبات كثيرة" }, { status: 429 });
  }

  if (!youcanPayConfigured()) {
    return NextResponse.json(
      { error: "بوابة الدفع غير مهيأة بعد. تواصلوا معنا لتجديد الاشتراك يدويا مؤقتا.", manual: true },
      { status: 503 }
    );
  }

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { plan, months, payerName, payerEmail, payerPhone } = parsed.data;

  const amount = priceFor(plan, months);
  if (amount <= 0) return NextResponse.json({ error: "خطة غير صالحة للدفع" }, { status: 400 });

  // Use an opaque short-lived id rather than echoing `orderId` in the URL —
  // the success/error pages resolve the order via the opaque token server-side
  // so the orderId never leaks via Referer headers to third-party CDNs.
  const orderId = `${tenant.slug}__${plan.toLowerCase()}__${months}m__${Date.now().toString(36)}__${crypto.randomUUID().slice(0, 8)}`;
  const payment = await control.tenantPayment.create({
    data: {
      tenantId: tenant.id,
      plan,
      amount,
      months,
      orderId,
      status: "PENDING",
    },
    select: { id: true },
  });

  const h = await headers();
  const host = normalizeHost(h.get("host")) ?? new URL(req.url).host;
  const proto = host?.includes("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;
  // Use the opaque payment.id as the URL token instead of orderId.
  const successToken = Buffer.from(payment.id).toString("base64url");
  const customerIp =
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "0.0.0.0";

  const result = await tokenize({
    orderId,
    amountMad: amount,
    successUrl: `${origin}/billing?paid=1&ref=${successToken}`,
    errorUrl: `${origin}/billing?paid=0&ref=${successToken}`,
    customerIp,
    customer: {
      name: payerName ?? session.user.fullName,
      email: payerEmail,
      phone: payerPhone,
    },
    metadata: {
      tenant_slug: tenant.slug,
      plan,
      months: String(months),
      payment_id: payment.id,
    },
  });

  if (!result.ok) {
    await control.tenantPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    // Generic message to the client — the YouCan API error detail is logged
    // server-side and could leak internals.
    console.error("youcan tokenize failed", result.message);
    return NextResponse.json({ error: "تعذر إنشاء عملية الدفع" }, { status: 502 });
  }

  await control.tenantPayment.update({
    where: { id: payment.id },
    data: { tokenId: result.tokenId },
  });

  return NextResponse.json({ ok: true, payUrl: paymentFormUrl(result.tokenId) });
}
