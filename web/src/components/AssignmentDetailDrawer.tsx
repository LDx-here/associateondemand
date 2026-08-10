"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { formatUsdFromCents } from "@/lib/stripe-pricing";
import { assignmentSourceLabel } from "@/lib/partner-submission";
import type { AssignmentStatus, AssignmentTier, InboxItem } from "@/lib/types";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<AssignmentTier, string> = {
  Template: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Custom: "bg-amber-50 text-amber-900 ring-amber-600/20",
  Research: "bg-sky-50 text-sky-800 ring-sky-600/20",
};

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  Submitted: "bg-violet-50 text-violet-800 ring-violet-600/20",
  "In progress": "bg-sky-50 text-sky-800 ring-sky-600/20",
  "Ready for review": "bg-amber-50 text-amber-900 ring-amber-600/20",
  Returned: "bg-rose-50 text-rose-800 ring-rose-600/20",
  Approved: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
};

type MissingItem = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  cta?: string;
};

type PreviewPayload = {
  item: InboxItem;
  matter: {
    matterId: string;
    title: string;
    caseType: string;
    status: string;
    posture?: string;
    country?: string;
    nextDeadline?: string | null;
  } | null;
  client: {
    id: string;
    displayName: string;
    role: string;
    email: string;
    organization: string;
  } | null;
  draft: {
    id: string;
    author: string;
    content: string;
    createdAt: string;
    preview: string;
  } | null;
  counts: {
    documents: number;
    legalElements: number;
    contacts: number;
    agentNotes: number;
  };
  factsCompleteness: { filled: number; total: number; percent: number } | null;
  firmMemory: { configured: boolean };
  missing: MissingItem[];
};

type PendingModal = {
  nextStatus: AssignmentStatus;
  title: string;
  noteRequired: boolean;
};

type Props = {
  item: InboxItem;
  demoMode: boolean;
  busy: boolean;
  onClose: () => void;
  onTransition: (item: InboxItem, nextStatus: AssignmentStatus, note?: string) => Promise<void>;
  onItemUpdated: (item: InboxItem) => void;
};

export function AssignmentDetailDrawer({
  item: initialItem,
  demoMode,
  busy,
  onClose,
  onTransition,
  onItemUpdated,
}: Props) {
  const [item, setItem] = useState(initialItem);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<PendingModal | null>(null);
  const [note, setNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const itemId = initialItem.id;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const resp = await fetch(`/api/inbox/${itemId}/preview`);
      const data = await resp.json();
      if (!resp.ok) {
        setLoadError(data.error || `Could not load preview (${resp.status}).`);
        return;
      }
      const payload = data as PreviewPayload;
      setPreview(payload);
      setItem(payload.item);
      onItemUpdated(payload.item);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Network error loading preview.");
    } finally {
      setLoading(false);
    }
  }, [itemId, onItemUpdated]);

  useEffect(() => {
    // Reset to the freshly opened assignment before refetching its preview.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset on itemId change
    setItem(initialItem);
    void loadPreview();
    // Re-load only when opening a different assignment, not when parent list refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key off itemId
  }, [itemId, loadPreview]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function openModal(nextStatus: AssignmentStatus, title: string, noteRequired: boolean) {
    setModal({ nextStatus, title, noteRequired });
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
    await onTransition(item, modal.nextStatus, trimmed || undefined);
    setModal(null);
    void loadPreview();
  }

  const status = item.status as AssignmentStatus;
  const matterHref = item.matterId
    ? (`/matters/${encodeURIComponent(item.matterId)}` as `/matters/${string}`)
    : null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/30"
        aria-label="Close assignment detail"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Assignment detail</p>
            <h2 id="assignment-detail-title" className="mt-1 text-lg font-semibold text-slate-900">
              {item.deliverableType || item.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tier ? (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    TIER_STYLES[item.tier],
                  )}
                >
                  {item.tier} tier
                </span>
              ) : null}
              {STATUS_STYLES[status] ? (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    STATUS_STYLES[status],
                  )}
                >
                  {status}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {item.status}
                </span>
              )}
              {item.priority ? (
                <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                  {item.priority} priority
                </span>
              ) : null}
              {assignmentSourceLabel(item.source) ? (
                <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900 ring-1 ring-inset ring-violet-600/20">
                  {assignmentSourceLabel(item.source)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading matter, draft, and checklist…
            </div>
          ) : null}
          {loadError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {loadError}
            </p>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <MetaRow label="Deliverable">{item.deliverableType || item.title || "—"}</MetaRow>
              <MetaRow label="Tier">{item.tier || "—"}</MetaRow>
              <MetaRow label="Priority">{item.priority || "—"}</MetaRow>
              <MetaRow label="Due">
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—"}
              </MetaRow>
              <MetaRow label="Submitted">
                <span className="inline-flex items-center gap-1">
                  <CircleDot className="h-3 w-3 text-slate-400" aria-hidden />
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </MetaRow>
              {item.paymentStatus ? (
                <MetaRow label="Payment">
                  {item.paymentStatus === "paid"
                    ? `Paid${item.amountCents ? ` · ${formatUsdFromCents(item.amountCents)}` : ""}`
                    : item.paymentStatus === "pending"
                      ? "Partner payment pending"
                      : item.paymentStatus}
                </MetaRow>
              ) : null}
            </dl>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matter & client</h3>
            {preview?.matter ? (
              <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{preview.matter.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {preview.matter.matterId}
                      {preview.matter.caseType ? ` · ${preview.matter.caseType}` : ""}
                      {preview.matter.posture ? ` · ${preview.matter.posture}` : ""}
                      {preview.matter.country ? ` · ${preview.matter.country}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/matters/${encodeURIComponent(preview.matter.matterId)}` as `/matters/${string}`}
                    className={cn(linkMatter, "inline-flex items-center gap-1 text-xs")}
                  >
                    Full matter
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No matter linked to this assignment.</p>
            )}

            {preview?.client ? (
              <div className="flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{preview.client.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {preview.client.role || "Contact"}
                    {preview.client.organization ? ` · ${preview.client.organization}` : ""}
                    {preview.client.email ? ` · ${preview.client.email}` : ""}
                  </p>
                </div>
                <Link
                  href={`/contacts/${encodeURIComponent(preview.client.id)}` as `/contacts/${string}`}
                  className={cn(linkMatter, "text-xs")}
                >
                  Profile
                </Link>
              </div>
            ) : preview && !loading ? (
              <p className="text-sm text-slate-500">No client contact linked yet.</p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Facts summary</h3>
            {item.facts?.trim() ? (
              <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {item.facts.trim()}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No freeform facts on this assignment.</p>
            )}
            {preview?.factsCompleteness ? (
              <p className="text-xs text-slate-500">
                Structured facts: {preview.factsCompleteness.filled}/{preview.factsCompleteness.total} (
                {preview.factsCompleteness.percent}%)
              </p>
            ) : null}
            {preview ? (
              <p className="text-[11px] text-slate-400">
                {preview.counts.documents} doc{preview.counts.documents === 1 ? "" : "s"} ·{" "}
                {preview.counts.legalElements} legal element
                {preview.counts.legalElements === 1 ? "" : "s"} · {preview.counts.contacts} contact
                {preview.counts.contacts === 1 ? "" : "s"}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft preview</h3>
              {matterHref ? (
                <Link href={matterHref} className={cn(linkMatter, "inline-flex items-center gap-1 text-xs")}>
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Open Associate
                </Link>
              ) : null}
            </div>
            {preview?.draft ? (
              <div className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  <span>{preview.draft.author || "Agent"}</span>
                  <span>·</span>
                  <span>{new Date(preview.draft.createdAt).toLocaleString()}</span>
                </div>
                <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800">
                  {preview.draft.preview}
                  {preview.draft.content.length > preview.draft.preview.length ? "…" : ""}
                </p>
                {matterHref ? (
                  <Link href={matterHref} className="mt-2 inline-block text-xs font-medium text-sky-800 hover:underline">
                    View full draft on matter →
                  </Link>
                ) : null}
              </div>
            ) : !loading ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">No draft yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Run Associate drafting on the matter to produce a first-pass memo for review.
                </p>
                {matterHref ? (
                  <Link href={matterHref} className={cn(btnPrimary, "mt-3 inline-flex text-xs")}>
                    Open Associate to draft
                  </Link>
                ) : null}
              </div>
            ) : null}
            {item.whatTried?.trim() && !preview?.draft ? (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">What tried: </span>
                {item.whatTried.trim()}
              </p>
            ) : null}
            {item.resolution && (status === "Returned" || status === "Approved") ? (
              <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                <span className="font-semibold">Note: </span>
                {item.resolution}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What&apos;s missing</h3>
            {preview && preview.missing.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>Ready for review context looks complete — matter, draft path, and Firm Memory are in place.</p>
              </div>
            ) : null}
            <ul className="space-y-2">
              {(preview?.missing ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-amber-950">{m.label}</p>
                    <p className="mt-0.5 text-xs text-amber-900/80">{m.detail}</p>
                    {m.href && m.cta ? (
                      <a
                        href={m.href}
                        className="mt-1.5 inline-block text-xs font-medium text-sky-800 hover:underline"
                      >
                        {m.cta} →
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {item.history && item.history.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {[...item.history].reverse().slice(0, 8).map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-slate-800">{h.status}</span>
                    <span className="text-slate-400">{new Date(h.at).toLocaleString()}</span>
                    {h.note ? <span className="w-full text-slate-600">{h.note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {status === "Submitted" ? (
              <button
                type="button"
                disabled={busy || demoMode}
                className={cn(btnPrimary, "text-xs")}
                onClick={() => void onTransition(item, "In progress")}
              >
                {busy ? "Starting…" : "Start work"}
              </button>
            ) : null}
            {status === "In progress" ? (
              <button
                type="button"
                disabled={busy || demoMode}
                className={cn(btnPrimary, "text-xs")}
                onClick={() => void onTransition(item, "Ready for review")}
              >
                {busy ? "Sending…" : "Send for review"}
              </button>
            ) : null}
            {status === "Ready for review" ? (
              <>
                <button
                  type="button"
                  disabled={busy || demoMode}
                  className={cn(btnPrimary, "text-xs")}
                  onClick={() => openModal("Approved", "Approve deliverable", false)}
                >
                  Approve deliverable
                </button>
                <button
                  type="button"
                  disabled={busy || demoMode}
                  className={cn(btnSecondary, "text-xs")}
                  onClick={() => openModal("Returned", "Request revision", true)}
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
                onClick={() => void onTransition(item, "In progress")}
              >
                {busy ? "Resuming…" : "Resume work"}
              </button>
            ) : null}
            {status === "Approved" ? (
              <span className="text-xs font-medium text-emerald-700">Signed off</span>
            ) : null}
            {matterHref ? (
              <Link href={matterHref} className={cn(btnSecondary, "text-xs")}>
                Open matter
              </Link>
            ) : null}
          </div>
          {demoMode ? (
            <p className="mt-2 text-[11px] text-amber-700">Connect live Airtable to move assignments.</p>
          ) : null}
        </div>
      </aside>

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {item.deliverableType || item.title}
              {item.matterId ? (
                <>
                  {" · "}
                  <Link
                    href={`/matters/${encodeURIComponent(item.matterId)}` as `/matters/${string}`}
                    className={linkMatter}
                  >
                    {item.matterId}
                  </Link>
                </>
              ) : null}
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
              <button type="button" className={btnSecondary} onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={cn(btnPrimary, "disabled:opacity-60")}
                onClick={() => void submitModal()}
                disabled={busy}
              >
                {busy ? "Saving…" : modal.title}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{children}</dd>
    </div>
  );
}
