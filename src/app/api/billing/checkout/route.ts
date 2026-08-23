import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { control, getTenantContext, normalizeHost } from "@/lib/tenants";
import { PLANS } from "@/lib/plans";
import { tokenize, youcanPayConfigured, paymentFormUrl } from "@/lib/payments/youcan";
import { headers } from "next/headers";

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO"]),
  months: z.union([z.literal(1), z.literal(12)]),
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
  if (!youcanPayConfigured()) {
    return NextResponse.json(
      { error: "بوابة الدفع غير مهيأة بعد. تواصلوا معنا لتجديد الاشتراك يدويا مؤقتا.", manual: true },
      { status: 503 }
    );
  }

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { plan, months } = parsed.data;

  const amount = priceFor(plan, months);
  if (amount <= 0) return NextResponse.json({ error: "خطة غير صالحة للدفع" }, { status: 400 });

  const orderId = `${tenant.slug}__${plan.toLowerCase()}__${months}m__${Date.now().toString(36)}`;
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

  const result = await tokenize({
    orderId,
    amountMad: amount,
    successUrl: `${origin}/billing?paid=1&order=${orderId}`,
    errorUrl: `${origin}/billing?paid=0&order=${orderId}`,
    customerIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
    customer: {
      name: tenant.name,
      email: undefined,
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
    return NextResponse.json({ error: `تعذر إنشاء عملية الدفع: ${result.message}` }, { status: 502 });
  }

  await control.tenantPayment.update({
    where: { id: payment.id },
    data: { tokenId: result.tokenId },
  });

  return NextResponse.json({ ok: true, payUrl: paymentFormUrl(result.tokenId), tokenId: result.tokenId });
}
