import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageGovernance } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

// POST /api/elections/[id]  body: { action, ...payload }
//
// Actions (each guards its own valid current-state transition):
//   openCandidacy  (DRAFT → CANDIDACY_OPEN)
//   addCandidacy   (CANDIDACY_OPEN) body.memberIds: string[]
//   closeCandidacy (CANDIDACY_OPEN → CANDIDACY_CLOSED)
//   openVoting     (CANDIDACY_CLOSED → VOTING_OPEN) body.eligibleVoters
//   castVote       (VOTING_OPEN) body.ballot: string[] (ranked candidacy ids)
//   closeVoting    (VOTING_OPEN → VOTING_CLOSED)
//   signMinutes    (VOTING_CLOSED) → ARCHIVED + ElectionMinute
//   publish        (any signed) → ElectionMinute.publishedAt = now
//   assignBureauRoles (any) body.bureauRoles: { [candidacyId]: role }

const CUID_RE = /^c[a-z0-9]{20,}$/i;
const MAX_BALLOT_LENGTH = 50; // sanity cap; no real election has more candidacies

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("openCandidacy") }),
  z.object({
    action: z.literal("addCandidacy"),
    memberIds: z.array(z.string().regex(CUID_RE, "invalid member id"))
      .min(1).max(50),
  }),
  z.object({ action: z.literal("closeCandidacy") }),
  z.object({
    action: z.literal("openVoting"),
    eligibleVoters: z.number().int().nonnegative().optional(),
  }),
  z.object({
    action: z.literal("castVote"),
    ballot: z.array(z.string().regex(CUID_RE, "invalid candidacy id"))
      .min(1).max(MAX_BALLOT_LENGTH),
  }),
  z.object({ action: z.literal("closeVoting") }),
  z.object({
    action: z.literal("signMinutes"),
    bureauRoles: z.record(z.string(), z.enum([
      "PRESIDENT", "VICE_PRESIDENT", "TREASURER", "SECRETARY", "MEMBER",
    ])).optional(),
    meetingStartedAt: z.string().datetime().optional(),
  }),
  z.object({ action: z.literal("publish") }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`election-act:${session.user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const action = parsed.data.action;

  const election = await prisma.election.findUnique({
    where: { id },
    include: {
      candidacies: {
        where: { withdrawnAt: null },
        include: { member: { select: { fullName: true, registrationNumber: true } } },
      },
    },
  });
  if (!election) return NextResponse.json({ error: "not found" }, { status: 404 });

  switch (action) {
    case "openCandidacy":
      if (election.status !== "DRAFT") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      await prisma.election.update({
        where: { id },
        data: { status: "CANDIDACY_OPEN" },
      });
      break;

    case "addCandidacy": {
      if (election.status !== "CANDIDACY_OPEN") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      // De-dup and validate against the DB in one query. We trust the
      // zod-level CUID regex; anything else is rejected at parse time.
      const requestedIds = Array.from(new Set(parsed.data.memberIds));
      const members = await prisma.member.findMany({
        where: {
          id: { in: requestedIds },
          isActive: true,
          memberType: "ADULT",
        },
        select: { id: true, fullName: true, registrationNumber: true },
      });
      const validIds = new Set(members.map((m) => m.id));
      const skipped = requestedIds.filter((id) => !validIds.has(id));
      // Compute the next ballot order from the current state inside
      // a transaction (race-safe vs two parallel addCandidacy calls).
      await prisma.$transaction(async (tx) => {
        const max = await tx.candidacy.aggregate({
          where: { electionId: id, withdrawnAt: null },
          _max: { ballotOrder: true },
        });
        const base = (max._max.ballotOrder ?? 0);
        for (let i = 0; i < members.length; i++) {
          await tx.candidacy.upsert({
            where: { electionId_memberId: { electionId: id, memberId: members[i].id } },
            update: {},
            create: {
              electionId: id,
              memberId: members[i].id,
              ballotOrder: base + i + 1,
            },
          });
        }
      });
      await recordAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "election_candidacy",
        entityId: id,
        after: { added: members.length, skipped },
        req,
      });
      return NextResponse.json({ ok: true, added: members.length, skipped });

      // Note: the break below would skip audit; the addCandidacy case
      // already returns. Kept structure parallel for readability.
      break;
    }

    case "closeCandidacy":
      if (election.status !== "CANDIDACY_OPEN") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      await prisma.election.update({
        where: { id },
        data: { status: "CANDIDACY_CLOSED" },
      });
      break;

    case "openVoting": {
      if (election.status !== "CANDIDACY_CLOSED") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      if (election.candidacies.length === 0) {
        return NextResponse.json({ error: "no candidacies" }, { status: 400 });
      }
      // Server-side derive eligibleVoters from the actual member count
      // (don't trust the client value).
      const adultActiveCount = await prisma.member.count({
        where: { isActive: true, memberType: "ADULT" },
      });
      await prisma.election.update({
        where: { id },
        data: {
          status: "VOTING_OPEN",
          eligibleVoters: adultActiveCount,
        },
      });
      break;
    }

    case "castVote": {
      if (election.status !== "VOTING_OPEN") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      // Resolve the voter: a User (admin) is NOT a member and cannot
      // vote. We require an active adult Member for the ballot to be
      // valid. session.user.id is a User.id; we need to find the
      // matching Member via username (Member.username mirrors the
      // User.username for admins who are also members).
      const member = await prisma.member.findFirst({
        where: { username: session.user.username, isActive: true, memberType: "ADULT" },
        select: { id: true, fullName: true },
      });
      if (!member) {
        return NextResponse.json({ error: "Voters must be active adult members" }, { status: 403 });
      }
      // De-dup the ballot (defends against score-inflation via duplicate
      // candidacy ids) and validate against the candidacies in the
      // current election. Reject withdrawn candidacies.
      const ballot = Array.from(new Set(parsed.data.ballot));
      const validCands = new Map(election.candidacies.map((c) => [c.id, c.member.fullName]));
      for (const cid of ballot) {
        if (!validCands.has(cid)) {
          return NextResponse.json({ error: `invalid candidacy id: ${cid}` }, { status: 400 });
        }
      }
      const weight = election.adultWeight;
      await prisma.vote.upsert({
        where: { electionId_voterId: { electionId: id, voterId: member.id } },
        update: { ballot: ballot as unknown as object, weight, castAt: new Date() },
        create: {
          electionId: id,
          voterId: member.id,
          ballot: ballot as unknown as object,
          weight,
        },
      });
      // Recompute the canonical votesCast counter.
      const votesCast = await prisma.vote.count({ where: { electionId: id } });
      await prisma.election.update({ where: { id }, data: { votesCast } });
      await recordAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "election_vote",
        entityId: id,
        after: { voterId: member.id, ballotSize: ballot.length, weight },
        req,
      });
      return NextResponse.json({ ok: true });

      // Note: parallel structure — see addCandidacy note above.
      break;
    }

    case "closeVoting":
      if (election.status !== "VOTING_OPEN") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      await prisma.election.update({
        where: { id },
        data: { status: "VOTING_CLOSED", closedAt: new Date() },
      });
      break;

    case "signMinutes": {
      if (election.status !== "VOTING_CLOSED") {
        return NextResponse.json({ error: "bad state" }, { status: 409 });
      }
      // Borda count: same formula used on the live page (fix #16).
      const votes = await prisma.vote.findMany({ where: { electionId: id } });
      const tally = new Map<string, number>();
      for (const v of votes) {
        const ballot = Array.isArray(v.ballot) ? (v.ballot as unknown as string[]) : [];
        if (ballot.length === 0) continue;
        ballot.forEach((cid, idx) => {
          const score = v.weight * (ballot.length - idx) / ballot.length;
          tally.set(cid, (tally.get(cid) ?? 0) + score);
        });
      }
      // Pull the full candidacy list (including withdrawn — the legal
      // record shows the full slate, with withdrawn marked).
      const allCandidacies = await prisma.candidacy.findMany({
        where: { electionId: id },
        include: { member: { select: { fullName: true, registrationNumber: true } } },
        orderBy: { ballotOrder: "asc" },
      });
      type RankedRow = { id: string; name: string; reg: number; withdrawn: boolean; score: number };
      const ranked: RankedRow[] = (allCandidacies as Array<{
        id: string; ballotOrder: number; withdrawnAt: Date | null;
        member: { fullName: string; registrationNumber: number } | null;
      }>).map((c) => ({
        id: c.id,
        name: c.member?.fullName ?? "—",
        reg: c.member?.registrationNumber ?? 0,
        withdrawn: c.withdrawnAt !== null,
        score: tally.get(c.id) ?? 0,
      })).sort((a, b) => b.score - a.score);
      const elected = ranked
        .filter((r) => !r.withdrawn)
        .slice(0, election.seats)
        .map((r) => ({ candidacyId: r.id, name: r.name, reg: r.reg, score: r.score }));

      // Bureau role assignment: persisted as a map { candidacyId: role }
      // so the minutes record the actual composition. If the caller
      // didn't supply a bureauRoles map, leave it empty (the bureau can
      // edit it via a future /api/elections/[id]/assign-bureau endpoint
      // — for now we record the structure).
      const bureauRoles = parsed.data.bureauRoles ?? {};

      const body = formatMinutes(election, ranked, elected, votes.length, election.eligibleVoters, bureauRoles);
      const meetingStartedAt = parsed.data.meetingStartedAt
        ? new Date(parsed.data.meetingStartedAt)
        : new Date();
      await prisma.electionMinute.create({
        data: {
          electionId: id,
          body,
          electedOrder: elected as unknown as object,
          bureauRoles: bureauRoles as unknown as object,
          signedBy: session.user.id,
          signedAt: meetingStartedAt,
        },
      });
      await prisma.election.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      await recordAudit({
        userId: session.user.id,
        action: "CREATE",
        entity: "election_minute",
        entityId: id,
        after: { elected: elected.length, votesCast: votes.length },
        req,
      });
      return NextResponse.json({ ok: true });
      break;
    }

    case "publish": {
      const minute = await prisma.electionMinute.findUnique({ where: { electionId: id } });
      if (!minute) return NextResponse.json({ error: "no minutes" }, { status: 400 });
      await prisma.electionMinute.update({
        where: { electionId: id },
        data: { publishedAt: new Date() },
      });
      await recordAudit({
        userId: session.user.id,
        action: "PUBLISH",
        entity: "election_minute",
        entityId: id,
        req,
      });
      return NextResponse.json({ ok: true });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}

function formatMinutes(
  election: { id: string; title: string; electionDate: Date; seats: number; adultWeight: number },
  ranked: { id: string; name: string; reg: number; withdrawn: boolean; score: number }[],
  elected: { candidacyId: string; name: string; reg: number; score: number }[],
  totalVotes: number,
  eligibleVoters: number,
  bureauRoles: Record<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`Procès-verbal — ${election.title}`);
  lines.push(`ID élection: ${election.id}`);
  lines.push(`Date du scrutin: ${election.electionDate.toISOString().slice(0, 10)}`);
  lines.push(`Sièges à pourvoir: ${election.seats}`);
  lines.push(`Électeurs inscrits: ${eligibleVoters}`);
  lines.push(`Votes enregistrés: ${totalVotes} (poids ${election.adultWeight})`);
  lines.push(`Quorum: ${eligibleVoters > 0 ? ((totalVotes / eligibleVoters) * 100).toFixed(1) : "?"}%`);
  lines.push("");
  lines.push("Candidatures (par ordre de score Borda) :");
  ranked.forEach((row, idx) => {
    const elected_mark = elected.some((e) => e.candidacyId === row.id) ? " — ÉLU" : "";
    const withdrawn = row.withdrawn ? " (RETIRÉ)" : "";
    lines.push(`  ${idx + 1}. #${row.reg} ${row.name} — score ${row.score.toFixed(2)}${elected_mark}${withdrawn}`);
  });
  if (elected.length > 0) {
    lines.push("");
    lines.push("Bureau élu :");
    elected.forEach((e) => {
      const role = bureauRoles[e.candidacyId] ?? "MEMBER";
      const roleLabel = role === "PRESIDENT" ? "Président"
        : role === "VICE_PRESIDENT" ? "Vice-Président"
        : role === "TREASURER" ? "Trésorier"
        : role === "SECRETARY" ? "Secrétaire"
        : "Membre";
      lines.push(`  ${roleLabel}: #${e.reg} ${e.name}`);
    });
  }
  lines.push("");
  lines.push(`Élection close et signée le ${new Date().toISOString().slice(0, 10)}.`);
  return lines.join("\n");
}
