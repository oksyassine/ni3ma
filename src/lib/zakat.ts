// Zakat calculator (زكاة المال). Pure helpers — no DB. Used by:
//   - /bureau/donations page (preview while recording a donation)
//   - /p/[slug] public donate page (donor-side calculator)
//   - /member portal (member-side "have I paid my Zakat this year?")
//
// Moroccan standard references:
//   - Nisab gold: 85 grams (~ 7.5 tola) at the current gold spot price.
//   - Nisab silver: 595 grams (~ 52.5 tola) at the current silver spot price.
//   - Zakat rate: 2.5% of total zakatable wealth above the nisab threshold.
//   - Hawl: Zakat is due on wealth held for one lunar year.
//
// We don't fetch live metal prices server-side here (that would couple
// the calculation to an external API). Callers pass `goldMadPerGram` and
// `silverMadPerGram` from their preferred source.

export const ZAKAT_RATE = 0.025;

export const ZAKAT_NISAB_GOLD_GRAMS = 85;
export const ZAKAT_NISAB_SILVER_GRAMS = 595;

export const ZAKAT_ASNAAF = [
  "FAQIR",               // الفقراء — the poor
  "MISKEEN",             // المساكين — the needy
  "AMIL",                // العاملون عليها — Zakat administrators
  "MUALLAFATUL_QULOOB",  // المؤلفة قلوبهم — those whose hearts are to be reconciled
  "FIR_RIQAB",           // في الرقاب — captives / slaves (modern: those enslaved by debt)
  "AL_GHARIMIN",         // الغارمون — debtors
  "FI_SABILILLAH",       // في سبيل الله — in the cause of Allah
  "IBN_AL_SABIL",        // ابن السبيل — travelers in need
] as const;

export type ZakatAsnaafName = typeof ZAKAT_ASNAAF[number];

export interface ZakatBreakdown {
  /** Lower of the two Nisab thresholds in MAD — the binding one. */
  nisabMad: number;
  /** Total zakatable wealth above the Nisab threshold. */
  baseMad: number;
  /** 2.5% of base. */
  zakatMad: number;
  /** Optional suggested split across the 8 asnaf (equal eighths). */
  suggestedPerAsnaaf: number;
}

export interface ZakatInputs {
  cashOnHand: number;       // MAD — bank accounts + wallet
  savings: number;          // MAD — savings accounts (held ≥ 1 lunar year)
  goldGrams: number;        // grams held (≥ Nisab threshold)
  silverGrams: number;      // grams held
  investments: number;       // MAD — stocks, crypto, business inventory
  receivables: number;      // MAD — money owed to you (likely to be repaid)
  payables: number;         // MAD — money you owe (subtract from base)
  goldMadPerGram: number;   // current MAD/gram spot price
  silverMadPerGram: number; // current MAD/gram spot price
}

export function computeZakat(input: ZakatInputs): ZakatBreakdown {
  const goldValue = input.goldGrams * input.goldMadPerGram;
  const silverValue = input.silverGrams * input.silverMadPerGram;
  const grossWealth =
    input.cashOnHand + input.savings + goldValue + silverValue
    + input.investments + input.receivables - Math.max(0, input.payables);

  const nisabGold = ZAKAT_NISAB_GOLD_GRAMS * input.goldMadPerGram;
  const nisabSilver = ZAKAT_NISAB_SILVER_GRAMS * input.silverMadPerGram;
  // The binding Nisab is the LOWER of gold and silver (more conservative).
  const nisabMad = Math.min(nisabGold, nisabSilver);

  const baseMad = Math.max(0, grossWealth - nisabMad);
  const zakatMad = +(baseMad * ZAKAT_RATE).toFixed(2);
  return {
    nisabMad: +nisabMad.toFixed(2),
    baseMad: +baseMad.toFixed(2),
    zakatMad,
    suggestedPerAsnaaf: +(zakatMad / ZAKAT_ASNAAF.length).toFixed(2),
  };
}

/** Zakat al-Fitr (زكاة الفطر): due at end of Ramadan, ~35 MAD / person in 2026. */
export const ZAKAT_FITRA_PER_PERSON_MAD = 35;
