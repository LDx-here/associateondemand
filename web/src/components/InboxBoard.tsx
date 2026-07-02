"use client";

import { ClipboardList, Inbox as InboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { InboxItem } from "@/lib/airtable/queries";
import { suggestedNextSteps } from "@/lib/inbox-followup";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";

type ResolveTarget = {
  item: InboxItem;
  option: string;
};

type AssignmentAction = { label: string; nextStatus: string; requiresNote: boolean };

/** Assignment lifecycle (docs/runbooks/autonomous-agent-pass.md priority #2). */
function assignmentActionsFor(status: string): AssignmentAction[] {
  switch (status) {
    case "Submitted":
      return [
        { label: "Start work", nextStatus: "In Progress", requiresNote: false },
        { label: "Return for more info", nextStatus: "Returned", requiresNote: true },
      ];
    case "In Progress":
      return [
        { label: "Mark ready for review", nextStatus: "Ready for Review", requiresNote: false },
        { label: "Return for more info", nextStatus: "Returned", requiresNote: true },
      ];
    case "Ready for Review":
      return [
        { label: "Approve", nextStatus: "Approved", requiresNote: false },
        { label: "Return for revision", nextStatus: "Returned", requiresNote: true },
      ];
    default:
      return [];
  }
}

type AssignmentTarget = {
  item: InboxItem;
  action: AssignmentAction;
};

export function InboxBoard({
  assignments: initialAssignments,
  pending: initialPending,
  resolved: initialResolved,
  demoMode,
}: {
  assignments: InboxItem[];
  pending: InboxItem[];
  resolved: InboxItem[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [pending, setPending] = useState(initialPending);
  const [resolved, setResolved] = useState(initialResolved);
  const [target, setTarget] = useState<ResolveTarget | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [assignmentBusy, setAssignmentBusy] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [followUpBanner, setFollowUpBanner] = useState<{ matterId: string; steps: string[] } | null>(
    null,
  );
  const [followUpChecks, setFollowUpChecks] = useState<boolean[]>([]);
  const [tasksBusy, setTasksBusy] = useState(false);
  const [taskPostError, setTaskPostError] = useState<string | null>(null);

  function open(item: InboxItem, option: string) {
    setTarget({ item, option });
    setNote(option);
    setError(null);
  }

  function close() {
    setTarget(null);
    setNote("");
    setError(null);
  }

  function clearFollowUp() {
    setFollowUpBanner(null);
    setFollowUpChecks([]);
    setTaskPostError(null);
  }

  async function runAssignmentTransition(item: InboxItem, action: AssignmentAction, noteText: string) {
    setAssignmentBusy(item.id);
    setAssignmentError(null);
    try {
      const resp = await fetch(`/api/inbox/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.nextStatus, note: noteText || undefined }),
      });
      if (!resp.ok) {
        setAssignmentError((await resp.text()) || `Update failed (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as { item: InboxItem };
      setAssignments((prev) => {
        const isTerminal = data.item.status === "Approved" || data.item.status === "Returned";
        if (isTerminal) return prev.filter((a) => a.id !== item.id);
        return prev.map((a) => (a.id === item.id ? data.item : a));
      });
      if (data.item.status === "Approved" || data.item.status === "Returned") {
        setResolved((prev) => [data.item, ...prev]);
      }
      setAssignmentTarget(null);
      router.refresh();
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setAssignmentBusy(null);
    }
  }

  function onAssignmentAction(item: InboxItem, action: AssignmentAction) {
    if (action.requiresNote) {
      setAssignmentTarget({ item, action });
      setAssignmentError(null);
      return;
    }
    void runAssignmentTransition(item, action, "");
  }

  async function submit() {
    if (!target) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Resolution note required.");
      return;
    }
    setError(null);
    const status = target.option.toLowerCase().startsWith("dismiss")
      ? "Dismissed"
      : "Resolved";

    const itemForFollowUp = { ...target.item, resolution: trimmed, status };
    const nextStepsList = suggestedNextSteps(itemForFollowUp);

    if (demoMode) {
      const now = new Date().toISOString();
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [
        {
          ...target.item,
          status,
          resolution: trimmed,
          resolvedAt: now,
        },
        ...prev,
      ]);
      close();
      if (nextStepsList.length && target.item.matterId.trim()) {
        setTaskPostError(null);
        setFollowUpBanner({ matterId: target.item.matterId.trim(), steps: nextStepsList });
        setFollowUpChecks(nextStepsList.map(() => true));
      }
      return;
    }

    startTransition(async () => {
      const resp = await fetch(`/api/inbox/${target.item.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: trimmed, status, option: target.option }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setError(text || `Resolve failed (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as { item: InboxItem };
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [data.item, ...prev]);
      close();
      router.refresh();
      const steps = suggestedNextSteps(data.item);
      if (steps.length && data.item.matterId.trim()) {
        setTaskPostError(null);
        setFollowUpBanner({ matterId: data.item.matterId.trim(), steps });
        setFollowUpChecks(steps.map(() => true));
      }
    });
  }

  async function createCheckedTasks() {
    if (!followUpBanner || demoMode || tasksBusy) return;
    setTasksBusy(true);
    setTaskPostError(null);
    try {
      for (let i = 0; i < followUpBanner.steps.length; i++) {
        if (!followUpChecks[i]) continue;
        const description = followUpBanner.steps[i].trim();
        if (!description) continue;
        const resp = await fetch(`/api/matters/${followUpBanner.matterId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            priority: "Medium",
            isFilingDeadline: false,
          }),
        });
        if (!resp.ok) {
          setTaskPostError(await resp.text());
          return;
        }
      }
      clearFollowUp();
      router.refresh();
    } finally {
      setTasksBusy(false);
    }
  }

  return (
    <>
      {followUpBanner ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 shadow-sm">
          <p className="font-semibold text-sky-900">Suggested next steps</p>
          <p className="mt-1 text-xs text-sky-900">
            Matter{" "}
            <Link href={`/matters/${followUpBanner.matterId}`} className={linkMatter}>
              {followUpBanner.matterId}
            </Link>
            . Tasks are optional: select lines, then POST to Airtable on your click.
          </p>
          <ul className="mt-3 space-y-2">
            {followUpBanner.steps.map((step, idx) => (
              <li key={`${step}-${idx}`} className="flex gap-2 text-sm">
                <input
                  id={`follow-step-${idx}`}
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={Boolean(followUpChecks[idx])}
                  onChange={() =>
                    setFollowUpChecks((prev) =>
                      prev.map((v, i) => (i === idx ? !v : v)),
                    )
                  }
                />
                <label htmlFor={`follow-step-${idx}`} className="text-sky-950">
                  {step}
                </label>
              </li>
            ))}
          </ul>
          {taskPostError ? (
            <p className="mt-2 text-sm text-rose-800">{taskPostError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {!demoMode ? (
              <button
                type="button"
                className={btnPrimary}
                disabled={tasksBusy || !followUpBanner.steps.some((_, idx) => followUpChecks[idx])}
                onClick={() => void createCheckedTasks()}
              >
                {tasksBusy ? "Creating…" : "Create tasks"}
              </button>
            ) : (
              <p className="text-xs font-medium text-sky-900">
                Connect live Airtable to create tasks from this banner.
              </p>
            )}
            <button type="button" className={btnSecondary} onClick={clearFollowUp}>
              Dismiss banner
            </button>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Assignments ({assignments.length})
          </h2>
        </div>
        {assignmentError ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {assignmentError}
          </p>
        ) : null}
        {assignments.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500"
          >
            <ClipboardList className="h-6 w-6 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-700">No open assignments.</span>
            <Link href="/assignments/new" className={linkMatter}>
              Submit a new assignment →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.map((item) => (
              <AssignmentCard
                key={item.id}
                item={item}
                busy={assignmentBusy === item.id}
                onAction={(action) => onAssignmentAction(item, action)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Agent flags ({pending.length})
          </h2>
        </div>
        {pending.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500"
          >
            <InboxIcon className="h-6 w-6 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-700">Inbox clear.</span>
            <span>Nothing waiting on attorney review.</span>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((item) => (
              <InboxCard
                key={item.id}
                item={item}
                onAction={(option) => open(item, option)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recently resolved
        </h2>
        {resolved.length > 0 ? (
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
            {resolved.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.title || item.agent}</span>
                  <StatusBadge status={item.status} />
                </div>
                {item.resolution ? (
                  <p className="mt-1 text-slate-700">{item.resolution}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {item.resolvedAt
                    ? new Date(item.resolvedAt).toLocaleString()
                    : ""}
                  {item.matterId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/matters/${item.matterId}`}
                        className={linkMatter}
                      >
                        {item.matterId}
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={InboxIcon}
              title="No resolved items yet."
              description="Resolved PM inbox items will appear here after you review pending items."
            />
          </div>
        )}
      </section>

      {target ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {target.option}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{target.item.title || target.item.agent}</p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">Resolution note</span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What did you do? What should the agent do next?"
              />
            </label>
            {error ? (
              <p className="mt-2 text-sm text-rose-700">{error}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={close}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnPrimary} disabled:opacity-60`}
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save resolution"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignmentTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{assignmentTarget.action.label}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {assignmentTarget.item.title || assignmentTarget.item.deliverableType}
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">Note to associate</span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What is missing, or what should change before resubmission?"
              />
            </label>
            {assignmentError ? (
              <p className="mt-2 text-sm text-rose-700">{assignmentError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setAssignmentTarget(null);
                  setNote("");
                  setAssignmentError(null);
                }}
                disabled={assignmentBusy === assignmentTarget.item.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnPrimary} disabled:opacity-60`}
                onClick={() => void runAssignmentTransition(assignmentTarget.item, assignmentTarget.action, note.trim())}
                disabled={assignmentBusy === assignmentTarget.item.id}
              >
                {assignmentBusy === assignmentTarget.item.id ? "Saving…" : assignmentTarget.action.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AssignmentCard({
  item,
  busy,
  onAction,
}: {
  item: InboxItem;
  busy: boolean;
  onAction: (action: AssignmentAction) => void;
}) {
  const actions = assignmentActionsFor(item.status);
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{item.deliverableType || item.title}</h3>
        <StatusBadge status={item.status} />
      </header>
      <p className="text-xs text-slate-500">
        {item.tier ? <span className="capitalize">{item.tier} tier</span> : null}
        {item.matterId ? (
          <>
            {" · "}
            <Link href={`/matters/${item.matterId}`} className={linkMatter}>
              {item.matterId}
            </Link>
          </>
        ) : null}
        {item.createdAt ? (
          <>
            {" · "}
            {new Date(item.createdAt).toLocaleString()}
          </>
        ) : null}
      </p>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Facts / instructions
        </h4>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
          {item.facts || item.whatTried || "No facts provided."}
        </p>
      </section>
      {item.resolution ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest note
          </h4>
          <p className="mt-0.5 text-sm text-slate-700">{item.resolution}</p>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.length === 0 ? (
          <span className="text-xs text-slate-500">No further action available.</span>
        ) : (
          actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={busy}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => onAction(action)}
            >
              {busy ? "Saving…" : action.label}
            </button>
          ))
        )}
      </div>
    </article>
  );
}

function InboxCard({
  item,
  onAction,
}: {
  item: InboxItem;
  onAction: (option: string) => void;
}) {
  const options = item.options.length > 0 ? item.options : ["Approve", "Reject", "Modify", "Defer"];
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {item.title || item.agent}
        </h3>
        <StatusBadge status={item.status} />
      </header>
      <p className="text-xs text-slate-500">
        {item.agent}
        {item.matterId ? (
          <>
            {" · "}
            <Link
              href={`/matters/${item.matterId}`}
              className={linkMatter}
            >
              {item.matterId}
            </Link>
          </>
        ) : null}
        {item.createdAt ? (
          <>
            {" · "}
            {new Date(item.createdAt).toLocaleString()}
          </>
        ) : null}
      </p>
      {item.whatTried ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What I tried
          </h4>
          <p className="mt-0.5 text-sm text-slate-700">{item.whatTried}</p>
        </section>
      ) : null}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
          What I need from you
        </h4>
        <p className="mt-0.5 text-sm font-medium text-slate-900">
          {item.whatNeeded || "Attorney review required."}
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50"
            onClick={() => onAction(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </article>
  );
}
