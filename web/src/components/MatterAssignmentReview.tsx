"use client";

import { CheckCircle2, ClipboardList, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useToast } from "@/components/Toast";
import type { AssignmentStatus, AssignmentTier, InboxItem, Note } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  Submitted: "bg-violet-50 text-violet-800 ring-violet-600/20",
  "In progress": "bg-sky-50 text-sky-800 ring-sky-600/20",
  "Ready for review": "bg-amber-50 text-amber-900 ring-amber-600/20",
  Returned: "bg-rose-50 text-rose-800 ring-rose-600/20",
  Approved: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
};

const TIER_STYLES: Record<AssignmentTier, string> = {
  Template: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Custom: "bg-amber-50 text-amber-900 ring-amber-600/20",
  Research: "bg-sky-50 text-sky-800 ring-sky-600/20",
};

const REVIEW_STATUSES = new Set<AssignmentStatus>([
  "Submitted",
  "In progress",
  "Ready for review",
  "Returned",
]);

function TierBadge({ tier }: { tier?: AssignmentTier }) {
  if (!tier) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TIER_STYLES[tier],
      )}
    >
      {tier} tier
    </span>
  );
}

function StatusChip({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

type PendingModal = {
  item: InboxItem;
  nextStatus: AssignmentStatus;
  title: string;
  noteRequired: boolean;
};

function latestAgentNote(notes: Note[]): Note | null {
  const agentNotes = notes
    .filter((n) => n.type === "Agent")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return agentNotes[0] ?? null;
}

function hasDeliverablePreview(item: InboxItem, agentNote: Note | null): boolean {
  if (agentNote) return true;
  const tried = item.whatTried?.toLowerCase() ?? "";
  return (
    tried.includes("produced") ||
    tried.includes("draft") ||
    tried.includes("memo") ||
    tried.includes("ready") ||
    tried.includes("first-pass")
  );
}

function previewText(item: InboxItem, agentNote: Note | null): string {
  if (agentNote?.content?.trim()) {
    return agentNote.content.trim().slice(0, 400);
  }
  if (item.whatTried?.trim()) return item.whatTried.trim();
  if (item.facts?.trim()) return item.facts.trim().slice(0, 300);
  return "";
}

type Props = {
  matterId: string;
  initialAssignments: InboxItem[];
  notes: Note[];
  demoMode?: boolean;
  onAssignmentUpdated?: () => void;
  onViewAgentNote?: () => void;
};

export function MatterAssignmentReview({
  matterId,
  initialAssignments,
  notes,
  demoMode = false,
  onAssignmentUpdated,
  onViewAgentNote,
}: Props) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<PendingModal | null>(null);
  const [note, setNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const agentNote = useMemo(() => latestAgentNote(notes), [notes]);

  const openAssignments = useMemo(
    () =>
      assignments.filter((a) => REVIEW_STATUSES.has(a.status as AssignmentStatus)),
    [assignments],
  );
  const approvedAssignments = useMemo(
    () => assignments.filter((a) => a.status === "Approved"),
    [assignments],
  );

  const refreshAssignments = useCallback(async () => {
    const resp = await fetch(`/api/matters/${matterId}/assignments`);
    if (resp.ok) {
      const data = (await resp.json()) as { assignments: InboxItem[] };
      setAssignments(data.assignments);
    }
    onAssignmentUpdated?.();
  }, [matterId, onAssignmentUpdated]);

  async function transition(item: InboxItem, nextStatus: AssignmentStatus, transitionNote?: string) {
    setBusyId(item.id);
    const prev = assignments;
    setAssignments((current) =>
      current.map((a) =>
        a.id === item.id
          ? {
              ...a,
              status: nextStatus,
              resolution: transitionNote?.trim() || a.resolution,
            }
          : a,
      ),
    );
    try {
      const resp = await fetch(`/api/inbox/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: transitionNote }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAssignments(prev);
        showToast(data.error || `Could not update assignment (${resp.status}).`, "error");
        return;
      }
      setAssignments((current) =>
        current.map((a) => (a.id === item.id ? (data.item as InboxItem) : a)),
      );
      showToast(
        nextStatus === "Approved"
          ? `Approved "${item.deliverableType || item.title}".`
          : nextStatus === "Returned"
            ? `Revision requested for "${item.deliverableType || item.title}".`
            : `Moved "${item.deliverableType || item.title}" to ${nextStatus}.`,
        "success",
      );
      await refreshAssignments();
    } catch (err) {
      setAssignments(prev);
      showToast(err instanceof Error ? err.message : "Network error updating assignment.", "error");
    } finally {
      setBusyId(null);
    }
  }

  function openModal(item: InboxItem, nextStatus: AssignmentStatus, title: string, noteRequired: boolean) {
    setModal({ item, nextStatus, title, noteRequired });
    setNote("");
    setModalError(null);
  }

  function closeModal() {
    setModal(null);
    setNote("");
    setModalError(null);
  }

  async function submitModal() {
    if (!modal) return;
    const trimmed = note.trim();
    if (modal.noteRequired && !trimmed) {
      setModalError("A note is required so the associate knows what to fix.");
      return;
    }
    await transition(modal.item, modal.nextStatus, trimmed || undefined);
    closeModal();
  }

  if (assignments.length === 0) return null;

  return (
    <>
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Deliverable review</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Approve or request revisions without leaving this matter.
              </p>
            </div>
          </div>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            View in inbox
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>

        {openAssignments.map((item) => {
          const status = item.status as AssignmentStatus;
          const busy = busyId === item.id;
          const showPreview = hasDeliverablePreview(item, agentNote);
          const snippet = previewText(item, agentNote);
          const isReviewReady = status === "Ready for review";

          return (
            <article
              key={item.id}
              className={cn(
                "rounded-md border p-4",
                isReviewReady
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-slate-200 bg-slate-50/50",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{item.deliverableType || item.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <TierBadge tier={item.tier} />
                    <StatusChip status={status} />
                    {item.priority ? (
                      <span className="text-[11px] text-slate-500">{item.priority} priority</span>
                    ) : null}
                  </div>
                </div>
                {item.dueDate ? (
                  <span className="text-[11px] text-slate-500">
                    Due {new Date(item.dueDate).toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              {snippet ? (
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">{snippet}</p>
              ) : null}

              {agentNote && showPreview ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-sky-800 hover:underline"
                  onClick={onViewAgentNote}
                >
                  View full agent output in Notes →
                </button>
              ) : null}

              {status === "Returned" && item.resolution ? (
                <p className="mt-2 rounded bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                  <span className="font-semibold">Revision note: </span>
                  {item.resolution}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {isReviewReady ? (
                  <>
                    <button
                      type="button"
                      disabled={busy || demoMode}
                      className={cn(btnPrimary, "text-xs")}
                      onClick={() => openModal(item, "Approved", "Approve deliverable", false)}
                    >
                      {busy ? "Saving…" : "Approve deliverable"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || demoMode}
                      className={cn(btnSecondary, "text-xs")}
                      onClick={() => openModal(item, "Returned", "Request revision", true)}
                    >
                      Request revision
                    </button>
                  </>
                ) : null}
                {status === "Returned" ? (
                  <button
                    type="button"
                    disabled={busy || demoMode}
                    className={cn(btnPrimary, "text-xs")}
                    onClick={() => void transition(item, "In progress")}
                  >
                    {busy ? "Resuming…" : "Resume work"}
                  </button>
                ) : null}
                {(status === "Submitted" || status === "In progress") && !isReviewReady ? (
                  <p className="text-xs text-slate-500">
                    {showPreview
                      ? "Draft in progress — you will be able to approve once it moves to Ready for review."
                      : "Awaiting PM pickup and drafting."}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}

        {approvedAssignments.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />
            <span className="font-medium text-emerald-900">
              Deliverable approved — {item.deliverableType || item.title}
            </span>
            {item.resolution ? (
              <span className="text-xs text-emerald-800">· {item.resolution}</span>
            ) : null}
          </div>
        ))}

        {demoMode ? (
          <p className="text-[11px] text-amber-700">Connect live Airtable to approve assignments from here.</p>
        ) : null}
      </section>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {modal.item.deliverableType || modal.item.title} · {matterId}
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">
                {modal.noteRequired ? "Revision note (required)" : "Sign-off note (optional)"}
              </span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  modal.noteRequired
                    ? "What needs to change before this can be approved?"
                    : "Anything the associate should know before export?"
                }
              />
            </label>
            {modalError ? <p className="mt-2 text-sm text-rose-700">{modalError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className={cn(btnPrimary, "disabled:opacity-60")}
                onClick={() => void submitModal()}
                disabled={busyId === modal.item.id}
              >
                {busyId === modal.item.id ? "Saving…" : modal.title}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
