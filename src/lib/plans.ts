import type { TenantPlan } from "@prisma/client";

// SaaS plan catalog. Prices in MAD, billed monthly. Caps are hard limits
// enforced at member-creation time (see assertMemberCapAllowed).
export type PlanConfig = {
  key: TenantPlan;
  label: string;
  priceMad: number;
  memberCap: number | null; // null = unlimited
  features: string[];
};

export const PLANS: Record<TenantPlan, PlanConfig> = {
  FREE: {
    key: "FREE",
    label: "مجاني",
    priceMad: 0,
    memberCap: 50,
    features: [
      "حتى 50 منخرطا",
      "الأعضاء، الحضور بالـQR، الاشتراكات",
      "لوحات الأقسام الأساسية",
      "نسخ احتياطي يومي",
    ],
  },
  STARTER: {
    key: "STARTER",
    label: "أساسي",
    priceMad: 99,
    memberCap: 300,
    features: [
      "حتى 300 منخرط",
      "تنبيهات أولياء الأمور",
      "تتبع الحفظ والتجويد الكامل",
      "المشاريع والحالات الاجتماعية",
      "تصدير التقارير المالية والإدارية",
    ],
  },
  PRO: {
    key: "PRO",
    label: "متقدم",
    priceMad: 199,
    memberCap: null,
    features: [
      "منخرطون بلا حدود",
      "صفحات عمومية شفافة لمشاريعكم",
      "لوحة متعددة الفروع أو الفيدراليات",
      "دعم ذو أولوية",
    ],
  },
  CUSTOM: {
    key: "CUSTOM",
    label: "مؤسسات",
    priceMad: 0,
    memberCap: null,
    features: ["فيدراليات وشبكات المساجد", "تهيئة ودعم خاص"],
  },
};

export function planLabel(plan: TenantPlan): string {
  return PLANS[plan]?.label ?? plan;
}
