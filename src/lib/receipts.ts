import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

// Auto-numbered receipt sequences per (tenant, year). Two prefixes are
// maintained separately:
//   - Donations: "R" + 6-digit sequence per year  (e.g., R/2026/000123)
//   - Contributions: "Q" + 6-digit sequence per year  (Q/2026/000045)
//
// Concurrency-safe: each generation reads the current max and writes
// inside a transaction. A parallel request that observes the same max
// will fail the unique constraint; the caller is expected to retry.

/**
 * Idempotently ensure a donation has a receipt number. If `signedBy` is
 * provided, stamps `receiptSignedBy` and `receiptIssuedAt` atomically —
 * a parallel stamp call won't overwrite the first stamper.
 */
export async function ensureDonationReceipt(donationId: string, signedBy?: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({
      where: { id: donationId },
      select: { receiptNumber: true, donationDate: true, paidAt: true, isPaid: true },
    });
    if (!d) throw new Error("Donation not found");
    if (!d.isPaid) throw new Error("Donation is not paid yet");

    if (d.receiptNumber) {
      // Atomic stamp: only writes if receiptSignedBy isn't already set,
      // so concurrent stamp calls don't race. The FK on receiptSignedBy
      // → User.id means a bad signedBy throws and rolls back, instead
      // of silently succeeding with a null stamp.
      if (signedBy) {
        await tx.donation.updateMany({
          where: { id: donationId, receiptSignedBy: null },
          data: { receiptSignedBy: signedBy, receiptIssuedAt: new Date() },
        });
      }
      return d.receiptNumber;
    }

    // Outside the tx we can't reuse tx.donation.findFirst for the nextSequence
    // call without leaking the tx; so do the seq read+update inside the tx.
    const refDate = d.paidAt ?? d.donationDate;
    const year = refDate.getFullYear();
    const prefix = `R/${year}/`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const last = await tx.donation.findFirst({
        where: { receiptNumber: { startsWith: prefix } },
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });
      const slice = last?.receiptNumber?.slice(prefix.length) ?? "";
      const lastSeq = /^\d+$/.test(slice) ? parseInt(slice, 10) : 0;
      const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
      const candidate = `${prefix}${String(next).padStart(6, "0")}`;
      try {
        await tx.donation.update({
          where: { id: donationId },
          data: {
            receiptNumber: candidate,
            receiptIssuedAt: new Date(),
            receiptSignedBy: signedBy ?? null,
          },
        });
        return candidate;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    throw new Error("Could not allocate donation receipt number");
  });
}

export async function ensureContributionReceipt(contributionId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const c = await tx.weeklyContribution.findUnique({
      where: { id: contributionId },
      select: { quittanceNumber: true, paidAt: true },
    });
    if (!c) throw new Error("Contribution not found");
    if (c.quittanceNumber) return c.quittanceNumber;

    const year = c.paidAt.getFullYear();
    const prefix = `Q/${year}/`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const last = await tx.weeklyContribution.findFirst({
        where: { quittanceNumber: { startsWith: prefix } },
        orderBy: { quittanceNumber: "desc" },
        select: { quittanceNumber: true },
      });
      const slice = last?.quittanceNumber?.slice(prefix.length) ?? "";
      const lastSeq = /^\d+$/.test(slice) ? parseInt(slice, 10) : 0;
      const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
      const candidate = `${prefix}${String(next).padStart(6, "0")}`;
      try {
        await tx.weeklyContribution.update({
          where: { id: contributionId },
          data: { quittanceNumber: candidate, quittanceIssuedAt: new Date() },
        });
        return candidate;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    throw new Error("Could not allocate contribution receipt number");
  });
}

export async function ensureBeneficiaryReceipt(receiptId: string, signedBy?: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const r = await tx.beneficiaryReceipt.findUnique({
      where: { id: receiptId },
      select: { receiptNumber: true, handedAt: true },
    });
    if (!r) throw new Error("Beneficiary receipt not found");
    if (r.receiptNumber) {
      if (signedBy) {
        await tx.beneficiaryReceipt.updateMany({
          where: { id: receiptId, receiptSignedBy: null },
          data: { receiptSignedBy: signedBy, receiptIssuedAt: new Date() },
        });
      }
      return r.receiptNumber;
    }
    const year = r.handedAt.getFullYear();
    const prefix = `B/${year}/`;
    for (let attempt = 0; attempt < 6; attempt++) {
      const last = await tx.beneficiaryReceipt.findFirst({
        where: { receiptNumber: { startsWith: prefix } },
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });
      const slice = last?.receiptNumber?.slice(prefix.length) ?? "";
      const lastSeq = /^\d+$/.test(slice) ? parseInt(slice, 10) : 0;
      const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
      const candidate = `${prefix}${String(next).padStart(6, "0")}`;
      try {
        await tx.beneficiaryReceipt.update({
          where: { id: receiptId },
          data: {
            receiptNumber: candidate,
            receiptIssuedAt: new Date(),
            receiptSignedBy: signedBy ?? null,
          },
        });
        return candidate;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    throw new Error("Could not allocate beneficiary receipt number");
  });
}
