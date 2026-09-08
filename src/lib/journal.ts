// Journal posting engine. Every money-mutation in Ni3ma calls one of
// these helpers, so the livre-journal stays in lockstep with reality.
//
// Rules:
//  1. Sum of debits MUST equal sum of credits for every JournalEntry.
//     We assert this in the helper before committing.
//  2. pieceNumber is unique per (tenant, year). Allocation runs OUTSIDE
//     the posting transaction because a unique-violation aborts the tx
//     and retries inside the same tx would all fail.
//  3. amount is the total per-side (debit or credit), not per-line.
//     Each side may have multiple lines (e.g. payroll: debit 6141 10,000
//     / credit 4431 8,000 + credit 4441 1,000 + credit 5141 1,000).
//  4. The auto-detected treasury account is overridable (e.g. for online
//     donations via YouCan → treasury is whatever bank receives the funds).
//  5. JournalEntry.accountCode is denormalized to the primary debit-side
//     account for fast grand-livre reads.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { donationIncomeAccount } from "./pcaf";

export interface JournalLineInput {
  accountCode: string;
  side: "DEBIT" | "CREDIT";
  amount: number; // MAD
  label?: string;
}

export interface PostJournalInput {
  entryDate: Date;
  source: "DONATION" | "CONTRIBUTION" | "EXPENSE" | "PAYROLL" | "DISTRIBUTION" | "GRANT" | "ADJUSTMENT" | "CLOSING";
  sourceId?: string;
  label: string;
  analyticCode?: string;
  notes?: string;
  lines: JournalLineInput[];
  defaultTreasury?: string;
}

export class JournalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JournalError";
  }
}

async function nextPieceNumber(year: number): Promise<string> {
  const yearPrefix = `J/${year}/`;
  const last = await prisma.journalEntry.findFirst({
    where: { pieceNumber: { startsWith: yearPrefix } },
    orderBy: { pieceNumber: "desc" },
    select: { pieceNumber: true },
  });
  const slice = last?.pieceNumber?.slice(yearPrefix.length) ?? "";
  const lastSeq = /^\d+$/.test(slice) ? parseInt(slice, 10) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${yearPrefix}${String(next).padStart(6, "0")}`;
}

export async function postJournal(input: PostJournalInput): Promise<string | null> {
  const debitTotal = input.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
  const creditTotal = input.lines.filter((l) => l.side === "CREDIT").reduce((s, l) => s + l.amount, 0);
  if (Math.abs(debitTotal - creditTotal) > 0.005) {
    throw new JournalError(
      `Unbalanced journal entry: debits=${debitTotal.toFixed(2)} credits=${creditTotal.toFixed(2)} (label="${input.label}")`,
    );
  }
  if (debitTotal === 0) return null;

  // Pre-flight: every account code must exist.
  for (const line of input.lines) {
    const exists = await prisma.chartOfAccount.findUnique({
      where: { code: line.accountCode },
      select: { code: true },
    });
    if (!exists) {
      throw new JournalError(`Unknown account code: ${line.accountCode}`);
    }
  }

  const year = input.entryDate.getFullYear();
  const primaryAccountCode = input.lines.find((l) => l.side === "DEBIT")?.accountCode
    ?? input.lines[0]?.accountCode;

  // Allocate piece number OUTSIDE the posting transaction. A unique
  // collision aborts the tx, so retries must run on a fresh tx.
  for (let attempt = 0; attempt < 5; attempt++) {
    const pieceNumber = await nextPieceNumber(year);
    try {
      const entry = await prisma.journalEntry.create({
        data: {
          entryDate: input.entryDate,
          pieceNumber,
          source: input.source,
          sourceId: input.sourceId ?? null,
          label: input.label,
          analyticCode: input.analyticCode ?? null,
          notes: input.notes ?? null,
          accountCode: primaryAccountCode ?? null,
          amount: new Prisma.Decimal(debitTotal.toFixed(2)),
          lines: {
            create: input.lines.map((l) => ({
              accountCode: l.accountCode,
              side: l.side,
              amount: new Prisma.Decimal(l.amount.toFixed(2)),
              label: l.label ?? null,
            })),
          },
        },
        select: { id: true },
      });
      return entry.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue; // pieceNumber race — try the next slot
      }
      throw err;
    }
  }
  throw new JournalError("Could not allocate piece number after 5 attempts");
}

// ---------- High-level helpers ----------

/** Donation received: debit treasury, credit income (kind-aware account). */
export async function postDonation(donationId: string, opts?: {
  treasuryAccount?: string;
  analyticCode?: string;
}): Promise<string | null> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { amount: true, donationDate: true, kind: true, donorName: true },
  });
  if (!donation) throw new JournalError(`Donation ${donationId} not found`);
  const amt = Number(donation.amount);
  if (amt <= 0) return null;
  const treasury = opts?.treasuryAccount ?? "5141";
  const incomeAccount = donationIncomeAccount(donation.kind ?? "CASH");
  return postJournal({
    entryDate: donation.donationDate,
    source: "DONATION",
    sourceId: donationId,
    label: `Don ${donation.donorName ?? "anonyme"} — ${donation.kind ?? "CASH"}`,
    analyticCode: opts?.analyticCode,
    lines: [
      { accountCode: treasury,   side: "DEBIT",  amount: amt, label: "Encaissement" },
      { accountCode: incomeAccount, side: "CREDIT", amount: amt, label: "Don" },
    ],
  });
}

/** Expense paid: debit expense account (per category), credit treasury. */
export async function postExpense(expenseId: string, opts?: {
  treasuryAccount?: string;
}): Promise<string | null> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { amount: true, expenseDate: true, category: true, description: true },
  });
  if (!expense) throw new JournalError(`Expense ${expenseId} not found`);
  const amt = Number(expense.amount);
  if (amt <= 0) return null;
  const expenseAccount = mapExpenseCategoryToAccount(expense.category);
  const treasury = opts?.treasuryAccount ?? "5141";
  return postJournal({
    entryDate: expense.expenseDate,
    source: "EXPENSE",
    sourceId: expenseId,
    label: expense.description.slice(0, 120),
    lines: [
      { accountCode: expenseAccount, side: "DEBIT",  amount: amt },
      { accountCode: treasury,        side: "CREDIT", amount: amt, label: "Paiement" },
    ],
  });
}

function mapExpenseCategoryToAccount(category: string): string {
  switch (category) {
    case "EDUCATIONAL":      return "6121"; // Fournitures pédagogiques
    case "SOCIAL":           return "6162"; // Frais de réception (iftaar, distributions)
    case "QURAN":            return "6111"; // Achats de marchandises
    case "ADMINISTRATIVE":   return "6123"; // Fournitures administratives (separated from educational)
    case "MAINTENANCE":      return "6133"; // Entretien et réparations
    case "OTHER":
    default:                 return "6167"; // Charges diverses
  }
}

/** Weekly contribution: debit treasury, credit 7111. */
export async function postContribution(contributionId: string, opts?: {
  treasuryAccount?: string;
}): Promise<string | null> {
  const c = await prisma.weeklyContribution.findUnique({
    where: { id: contributionId },
    select: { amount: true, paidAt: true, weekStart: true },
  });
  if (!c) throw new JournalError(`Contribution ${contributionId} not found`);
  const amt = Number(c.amount);
  if (amt <= 0) return null;
  const treasury = opts?.treasuryAccount ?? "5141";
  return postJournal({
    entryDate: c.paidAt ?? c.weekStart,
    source: "CONTRIBUTION",
    sourceId: contributionId,
    label: `Cotisation hebdomadaire`,
    lines: [
      { accountCode: treasury, side: "DEBIT",  amount: amt },
      { accountCode: "7111",  side: "CREDIT", amount: amt, label: "Cotisation adhérent" },
    ],
  });
}

/** Payroll: debit 6141 gross, credit 5141 net + 4441 IR + 4421 CNSS. */
export async function postPayroll(payrollId: string): Promise<string | null> {
  const p = await prisma.payrollRun.findUnique({
    where: { id: payrollId },
    select: { grossAmount: true, cnssAmount: true, netAmount: true, paidAt: true, period: true },
  });
  if (!p) throw new JournalError(`PayrollRun ${payrollId} not found`);
  const gross = Number(p.grossAmount);
  const cnss = p.cnssAmount === null ? 0 : Number(p.cnssAmount);
  const net = Number(p.netAmount);
  if (gross <= 0) return null;
  // Reject malformed period strings. The schema is YYYY-MM but bad input
  // can leak into manual PATCHes.
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.period)) {
    throw new JournalError(`Invalid period format: ${p.period} (expected YYYY-MM)`);
  }
  // Validate that the three amounts sum correctly. If they don't, we
  // surface the inconsistency instead of masking it (was previously
  // silently clamped to 0 IR).
  const ir = +(gross - cnss - net).toFixed(2);
  if (ir < 0 || ir > gross) {
    throw new JournalError(
      `Inconsistent payroll amounts: gross=${gross} cnss=${cnss} net=${net} → IR=${ir} is out of range`,
    );
  }
  const [year, month] = p.period.split("-");
  const entryDate = p.paidAt ?? new Date(Number(year), Number(month) - 1, 1);
  return postJournal({
    entryDate,
    source: "PAYROLL",
    sourceId: payrollId,
    label: `Salaires ${p.period}`,
    lines: [
      { accountCode: "6141", side: "DEBIT",  amount: gross, label: "Salaires bruts" },
      { accountCode: "5141", side: "CREDIT", amount: net,  label: "Paiement net" },
      { accountCode: "4441", side: "CREDIT", amount: ir,   label: "IR retenu" },
      { accountCode: "4421", side: "CREDIT", amount: cnss, label: "CNSS part salariale" },
    ],
  });
}
