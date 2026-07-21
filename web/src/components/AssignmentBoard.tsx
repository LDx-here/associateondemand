"use client";

import { CircleDot, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { formatUsdFromCents } from "@/lib/stripe-pricing";
import type { AssignmentStatus, AssignmentTier, InboxItem } from "@/lib/types";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const LANES: { status: AssignmentStatus; description: string }[] = [
  { status: "Submitted", description: "Awaiting PM pickup" },
  { status: "In progress", description: "Agent / associate drafting" },
  { status: "Ready for review", description: "Attorney sign-off needed" },
  { status: "Returned", description: "Sent back for revisions" },
  { status: "Approved", description: "Signed off, ready to export" },
];

const TIER_STYLES: Record<AssignmentTier, string> = {
  Template: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Custom: "bg-amber-50 text-amber-900 ring-amber-600/20",
  Research: "bg-sky-50 text-sky-800 ring-sky-600/20",
};

function PaymentBadge({ item }: { item: InboxItem }) {
  if (item.paymentStatus === "paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
        Paid{item.amountCents ? ` · ${formatUsdFromCents(item.amountCents)}` : ""}
      </span>
    );
  }
  if (item.paymentStatus === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-600/20">
        Partner payment pending
      </span>
    );
  }
  return null;
}

function TierBadge({ tier }: { tier?: AssignmentTier }) {
  if (!tier) return null;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", TIER_STYLES[tier])}>
      {tier} tier
    </span>
  );
}

type PendingModal = {
  item: InboxItem;
  nextStatus: AssignmentStatus;
  title: string;
  noteRequired: boolean;
};

export function AssignmentBoard({
  assignments: initial,
  demoMode,
}: {
  assignments: InboxItem[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<PendingModal | null>(null);
  const [note, setNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function transition(item: InboxItem, nextStatus: AssignmentStatus, transitionNote?: string) {
    setBusyId(item.id);
    try {
      const resp = await fetch(`/api/inbox/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: transitionNote }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || `Could not update assignment (${resp.status}).`, "error");
        return;
      }
      setAssignments((prev) => prev.map((a) => (a.id === item.id ? (data.item as InboxItem) : a)));
      showToast(`Moved "${item.title || item.deliverableType}" to ${nextStatus}.`, "success");
      startTransition(() => router.refresh());
    } catch (err) {
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

  const byLane = LANES.map((lane) => ({
    ...lane,
    items: assignments
      .filter((a) => a.status === lane.status)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  }));

  if (assignments.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet."
          description="Submit a new assignment to see it move through Submitted, In progress, Ready for review, and Approved."
          action={
            <Link href="/assignments/new" className={btnPrimary}>
              New assignment
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {byLane.map((lane) => (
          <div key={lane.status} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{lane.status}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                {lane.items.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{lane.description}</p>
            <div className="flex flex-col gap-2">
              {lane.items.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-3 text-center text-xs text-slate-400">
                  Nothing here.
                </p>
              ) : (
                lane.items.map((item) => {
                  const busy = busyId === item.id;
                  return (
                    <article key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{item.deliverableType || item.title}</p>
                        <div className="flex flex-wrap gap-1">
                          <PaymentBadge item={item} />
                          <TierBadge tier={item.tier} />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.matterId ? (
                          <Link href={`/matters/${item.matterId}`} className={linkMatter}>
                            {item.matterId}
                          </Link>
                        ) : (
                          "No matter linked"
                        )}
                        {item.priority ? ` · ${item.priority} priority` : ""}
                      </p>
                      {item.facts ? (
                        <p className="mt-2 line-clamp-3 text-xs text-slate-600">{item.facts}</p>
                      ) : null}
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                        <CircleDot className="h-3 w-3" aria-hidden />
                        {new Date(item.createdAt).toLocaleDateString()}
                        {item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString()}` : ""}
                      </p>
                      {item.resolution && (item.status === "Returned" || item.status === "Approved") ? (
                        <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                          <span className="font-semibold">Note: </span>
                          {item.resolution}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.status === "Submitted" ? (
                          <button
                            type="button"
                            disabled={busy || demoMode}
                            className={cn(btnPrimary, "text-xs")}
                            onClick={() => void transition(item, "In progress")}
                          >
                            {busy ? "Starting…" : "Start work"}
                          </button>
                        ) : null}
                        {item.status === "In progress" ? (
                          <button
                            type="button"
                            disabled={busy || demoMode}
                            className={cn(btnPrimary, "text-xs")}
                            onClick={() => void transition(item, "Ready for review")}
                          >
                            {busy ? "Sending…" : "Send for review"}
                          </button>
                        ) : null}
                        {item.status === "Ready for review" ? (
                          <>
                            <button
                              type="button"
                              disabled={busy || demoMode}
                              className={cn(btnPrimary, "text-xs")}
                              onClick={() => openModal(item, "Approved", "Approve deliverable", false)}
                            >
                              Approve deliverable
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
                        {item.status === "Returned" ? (
                          <button
                            type="button"
                            disabled={busy || demoMode}
                            className={cn(btnPrimary, "text-xs")}
                            onClick={() => void transition(item, "In progress")}
                          >
                            {busy ? "Resuming…" : "Resume work"}
                          </button>
                        ) : null}
                        {item.status === "Approved" ? (
                          <span className="text-xs font-medium text-emerald-700">Signed off</span>
                        ) : null}
                      </div>
                      {demoMode ? (
                        <p className="mt-2 text-[11px] text-amber-700">
                          Connect live Airtable to move assignments.
                        </p>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {modal.item.deliverableType || modal.item.title} ·{" "}
              <Link href={`/matters/${modal.item.matterId}`} className={linkMatter}>
                {modal.item.matterId}
              </Link>
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
              <button type="button" className={btnSecondary} onClick={closeModal} disabled={isPending}>
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
