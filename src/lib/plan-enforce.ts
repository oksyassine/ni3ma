import { prisma } from "./prisma";
import { getTenantContext } from "./tenants";
import { PLANS } from "./plans";
import type { TenantPlan } from "@prisma/client";

// Hard plan limits enforced at member-creation time. Runs inside the current
// request's tenant scope (the facade resolves the right DB automatically).

export type CapCheck =
  | { ok: true; plan: TenantPlan; remaining: number | null }
  | { ok: false; code: "CAP_REACHED"; message: string };

/** Effective billable plan: expired paid periods degrade to FREE limits. */
function effectivePlan(plan: TenantPlan, currentPeriodEnd: Date | null): TenantPlan {
  if (plan === "FREE" || plan === "CUSTOM") return plan;
  if (!currentPeriodEnd || currentPeriodEnd.getTime() < Date.now()) return "FREE";
  return plan;
}

/**
 * Throws nothing; returns a discriminated result the caller maps to a 402/403.
 * `extra` = how many new members this operation would create (imports pass N).
 */
export async function checkMemberCap(extra = 1): Promise<CapCheck> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: true, plan: "FREE", remaining: null }; // platform host / dev

  const plan = PLANS[effectivePlan(ctx.plan, ctx.currentPeriodEnd)];
  if (plan.memberCap === null) return { ok: true, plan: plan.key, remaining: null };

  const count = await prisma.member.count({ where: { isActive: true } });
  const remaining = plan.memberCap - count;
  if (remaining < extra) {
    return {
      ok: false,
      code: "CAP_REACHED",
      message: `بلغتم الحد الأقصى لخطة ${plan.label} (${plan.memberCap} منخرطا). قوموا بالترقية من صفحة الاشتراك لإضافة المزيد.`,
    };
  }
  return { ok: true, plan: plan.key, remaining };
}
