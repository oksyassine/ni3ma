import { revalidatePath } from "next/cache";

// Centralized invalidation so API routes don't drift apart on which pages
// to refresh. Keep the set conservative — revalidating more than needed
// adds latency to every mutation across the app.
export function revalidateBureau(section: "meetings" | "grants" | "assets" | "sponsorships" | "documents" | "mandates" | "distributions" | "mail" | "branches" | "trainings" | "volunteer-contracts" | "employees" | "partnerships" | "library" | "paperwork" | "campaigns" | "bene-receipts" | "inv-register" | "reminders" | "messages" | "audit") {
  revalidatePath(`/bureau/${section}`);
  // Paperwork hub lists recent meetings/donations/contributions → bust it.
  revalidatePath("/bureau/paperwork");
  // The annual report pulls from grants + payroll → bust on those.
  if (section === "grants" || section === "employees") {
    revalidatePath("/bureau/annual-report");
  }
  // Campaign changes update the public donation page.
  if (section === "campaigns") {
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/", "layout");
  }
}

export function revalidateAnnualReport() {
  revalidatePath("/bureau/annual-report");
}

export function revalidateFinancial() {
  revalidatePath("/financial/reports");
  revalidatePath("/financial/contributions");
  revalidatePath("/financial/donations");
  revalidatePath("/financial/expenses");
  revalidatePath("/financial/annual-report");
  revalidatePath("/bureau/reminders");
}
