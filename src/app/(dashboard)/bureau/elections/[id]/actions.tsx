"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";

// Lifecycle actions for an Election. Each action calls a specific API
// route (form-action POST) — keeps the page server-rendered.

export function ElectionActions({
  electionId,
  status,
  eligibleVoters,
  hasMinutes,
}: {
  electionId: string;
  status: string;
  eligibleVoters: number;
  hasMinutes: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [seats, setSeats] = useState("7");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [candidateIds, setCandidateIds] = useState("");
  const [ballot, setBallot] = useState("");

  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? `${label}: failed`);
        return;
      }
      toast.success(`${label}: ✓`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="text-sm font-bold">{t("gov.elections.actions")}</h2>

      {status === "DRAFT" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); post("/api/elections", { title, electionDate: date, seats: Number(seats) }, t("gov.elections.create")); setTitle(""); }}
        >
          <div className="space-y-1">
            <label className="text-xs">{t("gov.elections.colTitle")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs">{t("gov.elections.colDate")}</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs">{t("gov.elections.seats")}</label>
            <Input type="number" min="1" max="15" value={seats} onChange={(e) => setSeats(e.target.value)} className="w-20" />
          </div>
          <Button type="submit" disabled={busy}>{t("gov.elections.create")}</Button>
        </form>
      )}

      {status === "DRAFT" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !title}
          onClick={() => post(`/api/elections/${electionId}`, { action: "openCandidacy" }, t("gov.elections.openCandidacy"))}
        >
          🟡 {t("gov.elections.openCandidacy")}
        </Button>
      )}

      {status === "CANDIDACY_OPEN" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            post(`/api/elections/${electionId}`, { action: "addCandidacy", memberIds: candidateIds.split(",").map((s) => s.trim()).filter(Boolean) }, t("gov.elections.addCandidacy"));
            setCandidateIds("");
          }}
        >
          <div className="space-y-1">
            <label className="text-xs">{t("gov.elections.addCandidacy")} (member ids, comma-sep)</label>
            <Input value={candidateIds} onChange={(e) => setCandidateIds(e.target.value)} placeholder="cuid,cuid" />
          </div>
          <Button type="submit" size="sm" disabled={busy}>+ {t("gov.elections.addCandidacy")}</Button>
        </form>
      )}

      {status === "CANDIDACY_OPEN" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => post(`/api/elections/${electionId}`, { action: "closeCandidacy" }, t("gov.elections.closeCandidacy"))}
        >
          ⏹ {t("gov.elections.closeCandidacy")}
        </Button>
      )}

      {status === "CANDIDACY_CLOSED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => post(`/api/elections/${electionId}`, { action: "openVoting", eligibleVoters }, t("gov.elections.openVoting"))}
        >
          🟢 {t("gov.elections.openVoting")}
        </Button>
      )}

      {status === "VOTING_OPEN" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            post(`/api/elections/${electionId}`, { action: "castVote", ballot: ballot.split(",").map((s) => s.trim()).filter(Boolean) }, t("gov.elections.castVote"));
            setBallot("");
          }}
        >
          <div className="space-y-1">
            <label className="text-xs">{t("gov.elections.castVote")} (candidacy ids, ranked)</label>
            <Input value={ballot} onChange={(e) => setBallot(e.target.value)} placeholder="cuid,cuid" />
          </div>
          <Button type="submit" size="sm" disabled={busy}>🗳 {t("gov.elections.castVote")}</Button>
        </form>
      )}

      {status === "VOTING_OPEN" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => post(`/api/elections/${electionId}`, { action: "closeVoting" }, t("gov.elections.closeVoting"))}
        >
          ⏹ {t("gov.elections.closeVoting")}
        </Button>
      )}

      {status === "VOTING_CLOSED" && !hasMinutes && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => post(`/api/elections/${electionId}`, { action: "signMinutes" }, t("gov.elections.signMinutes"))}
        >
          📜 {t("gov.elections.signMinutes")}
        </Button>
      )}

      {hasMinutes && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => post(`/api/elections/${electionId}`, { action: "publish" }, t("gov.elections.publish"))}
        >
          📢 {t("gov.elections.publish")}
        </Button>
      )}
    </div>
  );
}
