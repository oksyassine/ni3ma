// CNSS Damancom export. Damancom (the Moroccan CNSS employer portal) accepts
// a fixed-width monthly declaration file per employee. Format reference:
//   - CNSS employer code (8 digits, zero-padded)
//   - CNSS employee number (9 digits, zero-padded)
//   - Period (MMYYYY, e.g. "082026")
//   - Days worked in month (3 digits)
//   - Gross salary declared (8 digits, centimes, e.g. 500000 = 5,000.00 MAD)
//   - AMO base (8 digits, centimes) — capped at the monthly ceiling
//   - AMO employee share (8 digits) — 2.26% for declared salaries
//   - AMO employer share (8 digits) — 2.26% (or 4.48% for CNSS-regulated CDI)
//   - ATI employee (8 digits) — 0.25% of gross
//   - ATI employer (8 digits) — 0.25% of gross
//   - TFP (formation pro) — 1.6% employer, capped monthly
//   - Total declared (8 digits, centimes)
//
// Layout below is a single line per employee, ASCII, LF-terminated. The
// Damancom importer accepts both CRLF and LF. We emit LF.

export interface DamancomLine {
  employerCode: string;     // 8-digit CNSS employer code
  employeeCnss: string;     // 9-digit CNSS employee number
  period: string;           // "MMYYYY"
  daysWorked: number;       // 1..31
  grossCents: number;       // gross salary in centimes
  amoBaseCents: number;     // AMO base (capped) in centimes
  amoEmployeeCents: number; // AMO employee share (2.26%)
  amoEmployerCents: number; // AMO employer share (2.26% or 4.48%)
  atiEmployeeCents: number; // ATI employee (0.25%)
  atiEmployerCents: number; // ATI employer (0.25%)
  tfpEmployerCents: number; // TFP employer (1.6%, capped)
}

const CNSS_AMO_EMPLOYEE_RATE = 0.0226;
const CNSS_AMO_EMPLOYER_RATE = 0.0448; // CDI AMO-T employer rate (regulatory cap)
const CNSS_ATI_RATE = 0.0025; // 0.25% each for employee + employer
const CNSS_TFP_RATE = 0.016;   // 1.6% employer, capped

// CNSS Damancom ceilings (2026 values — update annually per CNSS circular).
const CNSS_MONTHLY_GROSS_CAP_CENTS = 100_000_00; // 100,000 MAD/month cap for AMO base (illustrative)
const CNSS_TFP_MONTHLY_CAP_CENTS = 6_000_00;     // 6,000 MAD/month TFP cap (illustrative)

/** Compute the AMO + ATI + TFP breakdown from gross + days worked. */
export function computeDamancomLine(input: {
  employerCode: string;
  employeeCnss: string;
  period: string;            // "YYYY-MM"
  daysWorked: number;        // 1..31
  grossCents: number;        // gross salary in centimes
}): DamancomLine {
  const { employerCode, employeeCnss, daysWorked, grossCents } = input;
  const [yearStr, monthStr] = input.period.split("-");
  const period = `${monthStr}${yearStr}`;

  const amoBaseCents = Math.min(grossCents, CNSS_MONTHLY_GROSS_CAP_CENTS);
  const amoEmployeeCents = Math.round(amoBaseCents * CNSS_AMO_EMPLOYEE_RATE);
  const amoEmployerCents = Math.round(amoBaseCents * CNSS_AMO_EMPLOYER_RATE);
  const atiEmployeeCents = Math.round(grossCents * CNSS_ATI_RATE);
  const atiEmployerCents = Math.round(grossCents * CNSS_ATI_RATE);
  const tfpEmployerCents = Math.round(
    Math.min(grossCents, CNSS_TFP_MONTHLY_CAP_CENTS) * CNSS_TFP_RATE,
  );

  return {
    employerCode: padDigits(employerCode, 8),
    employeeCnss: padDigits(employeeCnss, 9),
    period,
    daysWorked: clamp(daysWorked, 1, 31),
    grossCents,
    amoBaseCents,
    amoEmployeeCents,
    amoEmployerCents,
    atiEmployeeCents,
    atiEmployerCents,
    tfpEmployerCents,
  };
}

/** Format a DamancomLine as a fixed-width ASCII record. */
export function formatDamancomLine(l: DamancomLine): string {
  return [
    l.employerCode,
    l.employeeCnss,
    l.period,
    padInt(l.daysWorked, 3),
    padInt(l.grossCents, 8),
    padInt(l.amoBaseCents, 8),
    padInt(l.amoEmployeeCents, 8),
    padInt(l.amoEmployerCents, 8),
    padInt(l.atiEmployeeCents, 8),
    padInt(l.atiEmployerCents, 8),
    padInt(l.tfpEmployerCents, 8),
  ].join("");
}

function padDigits(s: string, n: number): string {
  const digits = s.replace(/\D/g, "").slice(0, n);
  return digits.padStart(n, "0");
}

function padInt(n: number, width: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(width, "0");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Moroccan IR (Income Tax) 2026 brackets — progressive monthly.
 * Returns MAD amount to withhold from a gross monthly salary.
 */
const IR_BRACKETS: Array<{ upTo: number; rate: number; subtract: number }> = [
  { upTo: 2_500,    rate: 0.00, subtract: 0 },       // 0%   up to 2,500
  { upTo: 8_333.33, rate: 0.10, subtract: 250 },     // 10%  next 5,833.33 → minus 250
  { upTo: 15_000,   rate: 0.20, subtract: 833.33 },   // 20%  next 6,666.67 → minus 833.33
  { upTo: 20_000,   rate: 0.30, subtract: 1_583.33 }, // 30%  next 5,000    → minus 1,583.33
  { upTo: Infinity, rate: 0.38, subtract: 2_783.33 }, // 38%  above        → minus 2,783.33
];

/** Compute IR withholding (in MAD) for a monthly gross salary. */
export function computeIrMonthly(grossMad: number): number {
  if (grossMad <= 0) return 0;
  let remaining = grossMad;
  let totalTax = 0;
  let lower = 0;
  for (const b of IR_BRACKETS) {
    const slice = Math.max(0, Math.min(remaining, b.upTo - lower));
    if (slice <= 0) break;
    totalTax += slice * b.rate;
    remaining -= slice;
    lower = b.upTo;
    if (remaining <= 0) break;
  }
  // The subtract column in the brackets table is the cumulative deduction
  // equivalent to the simplified formula: bracket tax − bracket subtract.
  // (Simplified for clarity; production use the official CGI table.)
  const lastBracket = IR_BRACKETS[IR_BRACKETS.length - 1];
  return Math.max(0, +(totalTax - lastBracket.subtract).toFixed(2));
}
