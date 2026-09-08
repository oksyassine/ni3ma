import { prisma } from "./prisma";
import { getTenantContext } from "./tenants";
import { PLANS } from "./plans";
import { Prisma, type TenantPlan } from "@prisma/client";

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
 * Counts members that count against the cap. Inactive members don't count —
 * but the cap is reset to count *all* members (active OR not) for free plans
 * so an admin can't bypass the cap by toggling `isActive=false` (Phase 0/1
 * finding F2.1).
 */
async function billedMemberCount(): Promise<number> {
  return prisma.member.count();
}

/**
 * Throws nothing; returns a discriminated result the caller maps to a 402/403.
 * `extra` = how many new members this operation would create (imports pass N).
 *
 * Use `createCappedMember()` for the write path so the cap check and the
 * create are inside the same transaction (TOCTOU-safe).
 */
export async function checkMemberCap(extra = 1): Promise<CapCheck> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: true, plan: "FREE", remaining: null }; // platform host / dev

  const plan = PLANS[effectivePlan(ctx.plan, ctx.currentPeriodEnd)];
  if (plan.memberCap === null) return { ok: true, plan: plan.key, remaining: null };

  const count = await billedMemberCount();
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

export class CapReachedError extends Error {
  code = "CAP_REACHED" as const;
}

/**
 * Atomically check the cap and insert a member. Throws CapReachedError if
 * the count + extra exceeds the plan limit. The whole check-and-write runs
 * in a single Postgres transaction at SERIALIZABLE isolation so concurrent
 * inserts serialize and only one wins the slot.
 */
export async function createCappedMember(
  data: Parameters<typeof prisma.member.create>[0]["data"],
): Promise<Awaited<ReturnType<typeof prisma.member.create>>> {
  const ctx = await getTenantContext();

  return prisma.$transaction(
    async (tx) => {
      if (ctx) {
        const plan = PLANS[effectivePlan(ctx.plan, ctx.currentPeriodEnd)];
        if (plan.memberCap !== null) {
          const count = await tx.member.count();
          if (count + 1 > plan.memberCap) {
            throw new CapReachedError(
              `بلغتم الحد الأقصى لخطة ${plan.label} (${plan.memberCap} منخرطا). قوموا بالترقية من صفحة الاشتراك لإضافة المزيد.`,
            );
          }
        }
      }
      return tx.member.create({ data });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
