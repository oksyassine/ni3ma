// PCAF (Plan Comptable des Associations) — Moroccan association chart of
// accounts. Adapted from the CGNC (Code Général de la Normalisation
// Comptable) classes 1-9 with association-specific extensions.
//
// Reference: Plan Comptable Marocain (PCM), CGNC. Association-specific
// accounts use the 7xxx series (revenus) and 6xxx series (charges) per
// Dahir 1-58-376 conventions.
//
// Standard 7-class income accounts used by associations:
//   7111  Cotisations des adhérents
//   7112  Dons manuels (one-off donations)
//   7113  Zakat al-Fitr
//   7114  Zakat al-Mal
//   7115  Sadaqa / waqf / kaffara
//   7121  Subventions INDH
//   7122  Subventions communes
//   7123  Subventions ministères
//   7124  Subventions international (UE, AFD, USAID)
//   7125  Subventions fondations
//   7129  Autres subventions
//   7131  Revenus manifestations / galas
//   7132  Revenus formations / cours
//   7141  Revenus de kafala (sponsorships)
//   7142  Revenus loyer / location
//   7143  Cotisations extraordinaires
//
// Standard 6-class expense accounts:
//   6111  Achats de marchandises
//   6112  Achats stockés (inventory)
//   6121  Fournitures de bureau
//   6122  Carburant / transport
//   6131  Loyers et charges locatives
//   6132  Eau, électricité, gaz
//   6133  Entretien et réparations
//   6134  Primes d'assurance
//   6141  Salaires et appointements
//   6142  Charges sociales (CNSS)
//   6143  Avantages en nature
//   6151  Honoraires (comptable, avocat)
//   6161  Frais de déplacement
//   6162  Frais de réception
//   6163  Frais de communication
//   6164  Frais postaux
//   6165  Services bancaires
//   6166  Cotisations versées
//   6167  Charges diverses
//
// Standard 5-class treasury (asset):
//   5141  Banque (Cih, Attijariwafa, BMCE, Barid Bank)
//   5142  CCP / Barid Bank postal
//   5143  CashPlus / Wafacash
//   5161  Caisse (espèces)
//   5171  Chèques à encaisser
//
// Standard 4-class third parties (liability/asset):
//   4411  Fournisseurs
//   4421  CNSS à payer
//   4422  Mutuelle à payer
//   4431  Salaires nets à payer
//   4441  IR à payer
//   4451  TVA à payer
//   4452  IS à payer
//
// Standard 1-class equity:
//   1111  Report à nouveau (réserves)
//   1112  Résultat de l'exercice
//
// Class 8 (special accounts) and class 9 (analytic / grant tracking)
// are used for engagement hors bilan and bailleur reporting respectively.

// Seed data — every Moroccan association tenant gets this chart seeded.
export const PCAF_SEED: ReadonlyArray<{
  code: string;
  label: string;
  class: number;
  type: AccountType;
}> = [
  // Class 1 — Equity
  { code: "1111", label: "Report à nouveau", class: 1, type: "LIABILITY" },
  { code: "1112", label: "Résultat de l'exercice", class: 1, type: "LIABILITY" },
  { code: "1191", label: "Subventions d'investissement", class: 1, type: "LIABILITY" },

  // Class 4 — Third parties
  { code: "4411", label: "Fournisseurs", class: 4, type: "LIABILITY" },
  { code: "4421", label: "CNSS à payer", class: 4, type: "LIABILITY" },
  { code: "4431", label: "Salaires nets à payer", class: 4, type: "LIABILITY" },
  { code: "4441", label: "IR à payer", class: 4, type: "LIABILITY" },
  { code: "4451", label: "TVA à payer", class: 4, type: "LIABILITY" },
  { code: "4452", label: "IS à payer", class: 4, type: "LIABILITY" },

  // Class 5 — Treasury
  { code: "5141", label: "Banque (CIH, Attijariwafa, BMCE)", class: 5, type: "ASSET" },
  { code: "5142", label: "CCP / Barid Bank", class: 5, type: "ASSET" },
  { code: "5143", label: "CashPlus / Wafacash", class: 5, type: "ASSET" },
  { code: "5161", label: "Caisse (espèces)", class: 5, type: "ASSET" },
  { code: "5171", label: "Chèques à encaisser", class: 5, type: "ASSET" },

  // Class 6 — Charges
  { code: "6111", label: "Achats de marchandises", class: 6, type: "EXPENSE" },
  { code: "6112", label: "Achats stockés (inventaire)", class: 6, type: "EXPENSE" },
  { code: "6121", label: "Fournitures de bureau", class: 6, type: "EXPENSE" },
  { code: "6122", label: "Carburant et transport", class: 6, type: "EXPENSE" },
  { code: "6131", label: "Loyers et charges locatives", class: 6, type: "EXPENSE" },
  { code: "6132", label: "Eau, électricité, gaz", class: 6, type: "EXPENSE" },
  { code: "6133", label: "Entretien et réparations", class: 6, type: "EXPENSE" },
  { code: "6134", label: "Primes d'assurance", class: 6, type: "EXPENSE" },
  { code: "6141", label: "Salaires et appointements", class: 6, type: "EXPENSE" },
  { code: "6142", label: "Charges sociales (CNSS)", class: 6, type: "EXPENSE" },
  { code: "6151", label: "Honoraires", class: 6, type: "EXPENSE" },
  { code: "6161", label: "Frais de déplacement", class: 6, type: "EXPENSE" },
  { code: "6162", label: "Frais de réception", class: 6, type: "EXPENSE" },
  { code: "6163", label: "Frais de communication", class: 6, type: "EXPENSE" },
  { code: "6165", label: "Services bancaires", class: 6, type: "EXPENSE" },
  { code: "6167", label: "Charges diverses", class: 6, type: "EXPENSE" },

  // Class 7 — Produits
  { code: "7111", label: "Cotisations des adhérents", class: 7, type: "INCOME" },
  { code: "7112", label: "Dons manuels (ponctuels)", class: 7, type: "INCOME" },
  { code: "7113", label: "Zakat al-Fitr", class: 7, type: "INCOME" },
  { code: "7114", label: "Zakat al-Mal", class: 7, type: "INCOME" },
  { code: "7115", label: "Sadaqa, waqf, kaffara", class: 7, type: "INCOME" },
  { code: "7121", label: "Subventions INDH", class: 7, type: "INCOME" },
  { code: "7122", label: "Subventions communes", class: 7, type: "INCOME" },
  { code: "7123", label: "Subventions ministères", class: 7, type: "INCOME" },
  { code: "7124", label: "Subventions internationales (UE, AFD)", class: 7, type: "INCOME" },
  { code: "7125", label: "Subventions fondations", class: 7, type: "INCOME" },
  { code: "7129", label: "Autres subventions", class: 7, type: "INCOME" },
  { code: "7131", label: "Revenus manifestations et galas", class: 7, type: "INCOME" },
  { code: "7132", label: "Revenus formations et cours", class: 7, type: "INCOME" },
  { code: "7141", label: "Revenus de kafala (parrainages)", class: 7, type: "INCOME" },
  { code: "7143", label: "Cotisations extraordinaires", class: 7, type: "INCOME" },

  // Class 9 — Analytic (bailleur / projet)
  { code: "9111", label: "Projet social A", class: 9, type: "ANALYTIC" },
  { code: "9112", label: "Projet social B", class: 9, type: "ANALYTIC" },
];

export type AccountType = "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "ANALYTIC";

/** Seed the PCAF chart into the tenant DB if missing. Idempotent. */
export async function seedChart(prisma: { chartOfAccount: { upsert: (args: { where: { code: string }; update: Record<string, never>; create: { code: string; label: string; class: number; type: AccountType } }) => Promise<unknown> } }) {
  for (const acc of PCAF_SEED) {
    await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        label: acc.label,
        class: acc.class,
        type: acc.type,
      },
    });
  }
}

/**
 * Infer the income account for a donation kind. Falls back to 7112
 * (one-off donation) for unknown kinds.
 */
export function donationIncomeAccount(kind: string | null | undefined): string {
  switch (kind) {
    case "ZAKAT_FITRA": return "7113";
    case "ZAKAT_MAL":   return "7114";
    case "SADAQA":
    case "WAQF":
    case "KAFFARA":     return "7115";
    case "IN_KIND":     return "7112"; // in-kind treated as income at receipt
    case "CASH":
    default:            return "7112";
  }
}

/** Default cash treasury accounts, ordered by likelihood. */
export const TREASURY_ACCOUNTS = ["5141", "5142", "5143", "5161", "5171"] as const;
