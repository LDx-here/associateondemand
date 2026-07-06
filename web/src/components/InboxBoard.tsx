"use client";

import { AlertTriangle, Bot, CheckCircle2, ChevronDown, ChevronRight, Inbox as InboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import type { InboxItem } from "@/lib/airtable/queries";
import {
  alertActionLabel,
  alertActionsForItem,
  type AlertAction,
} from "@/lib/inbox-alert-actions";
import { suggestedNextSteps } from "@/lib/inbox-followup";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type ResolveTarget = {
  item: InboxItem;
  action: AlertAction;
};

export function InboxBoard({
  pending: initialPending,
  resolved: initialResolved,
  demoMode,
}: {
  pending: InboxItem[];
  resolved: InboxItem[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(initialPending);
  const [resolved, setResolved] = useState(initialResolved);
  const [target, setTarget] = useState<ResolveTarget | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(initialPending.length === 0);
  const [isPending, startTransition] = useTransition();
  const [followUpBanner, setFollowUpBanner] = useState<{ matterId: string; steps: string[] } | null>(
    null,
  );
  const [followUpChecks, setFollowUpChecks] = useState<boolean[]>([]);
  const [tasksBusy, setTasksBusy] = useState(false);
  const [taskPostError, setTaskPostError] = useState<string | null>(null);

  function open(item: InboxItem, action: AlertAction) {
    setTarget({ item, action });
    setNote("");
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

  async function submit() {
    if (!target) return;
    const trimmed = note.trim();
    if (target.action.noteRequired && !trimmed) {
      setError("A note is required for this action.");
      return;
    }
    setError(null);
    const status = target.action.resolvedStatus;
    const resolution = trimmed || target.action.label;

    const itemForFollowUp = { ...target.item, resolution, status };
    const nextStepsList = suggestedNextSteps(itemForFollowUp);

    if (demoMode) {
      const now = new Date().toISOString();
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [
        {
          ...target.item,
          status,
          resolution,
          resolvedAt: now,
        },
        ...prev,
      ]);
      close();
      showToast(`Alert ${alertActionLabel(status).toLowerCase()} — ${target.item.title || target.item.agent}.`, "success");
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
        body: JSON.stringify({
          resolution,
          status,
          option: target.action.option,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setError(text || `Could not update alert (${resp.status})`);
        showToast("Could not update agent alert.", "error");
        return;
      }
      const data = (await resp.json()) as {
        item: InboxItem;
        pmResume?: { error?: string; agent?: unknown; skipped?: boolean };
      };
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [data.item, ...prev]);
      close();
      const label = alertActionLabel(status);
      if (target.action.resumesAgent && data.pmResume?.error) {
        showToast(`Alert ${label.toLowerCase()}, but agent resume failed: ${data.pmResume.error}`, "error");
      } else if (target.action.resumesAgent) {
        showToast(`Agent resumed on ${target.item.matterId || "matter"}.`, "success");
      } else {
        showToast(`Alert ${label.toLowerCase()} — ${target.item.title || target.item.agent}.`, "success");
      }
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
            Open alerts ({pending.length})
          </h2>
        </div>
        {pending.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden />
            <span className="font-medium text-slate-700">No open agent alerts.</span>
            <span>Agents will surface gaps here when they need attorney input.</span>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((item) => (
              <AgentAlertCard
                key={item.id}
                item={item}
                onAction={(action) => open(item, action)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
        >
          {historyOpen ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
          Alert history ({resolved.length})
        </button>
        {historyOpen ? (
          resolved.length > 0 ? (
            <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
              {resolved.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <StatusBadge status={item.status} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{item.title || item.agent}</p>
                    {item.resolution ? (
                      <p className="mt-0.5 line-clamp-2 text-slate-600">{item.resolution}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {item.resolvedAt ? new Date(item.resolvedAt).toLocaleString() : ""}
                      {item.matterId ? (
                        <>
                          {" · "}
                          <Link href={`/matters/${item.matterId}`} className={linkMatter}>
                            {item.matterId}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <EmptyState
                icon={InboxIcon}
                title="No alert history yet."
                description="Resolved and dismissed agent alerts appear here."
              />
            </div>
          )
        ) : null}
      </section>

      {target ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{target.action.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{target.action.subtitle}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {target.item.title || target.item.agent}
              {target.item.matterId ? (
                <>
                  {" · "}
                  <Link href={`/matters/${target.item.matterId}`} className={linkMatter}>
                    {target.item.matterId}
                  </Link>
                </>
              ) : null}
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">{target.action.noteLabel}</span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={target.action.notePlaceholder}
              />
            </label>
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={close}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(btnPrimary, "disabled:opacity-60")}
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? "Updating…" : target.action.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AgentAlertCard({
  item,
  onAction,
}: {
  item: InboxItem;
  onAction: (action: AlertAction) => void;
}) {
  const actions = alertActionsForItem(item.options);
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-amber-200/80 bg-white p-4 shadow-sm ring-1 ring-amber-100">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-md bg-amber-50 p-1.5 text-amber-700 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{item.title || "Agent needs input"}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Bot className="h-3 w-3" aria-hidden />
              {item.agent}
            </p>
          </div>
        </div>
        <StatusBadge status="Pending" />
      </header>
      <p className="text-xs text-slate-500">
        {item.matterId ? (
          <Link href={`/matters/${item.matterId}`} className={linkMatter}>
            {item.matterId}
          </Link>
        ) : (
          "No matter linked"
        )}
        {item.createdAt ? <> · {new Date(item.createdAt).toLocaleString()}</> : null}
      </p>
      {item.whatTried ? (
        <section className="rounded-md bg-slate-50 px-3 py-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Agent tried</h4>
          <p className="mt-0.5 text-sm text-slate-700">{item.whatTried}</p>
        </section>
      ) : null}
      <section className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">Needs from you</h4>
        <p className="mt-0.5 text-sm font-medium text-slate-900">
          {item.whatNeeded || "Attorney review required."}
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.option}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              action.variant === "primary" && btnPrimary,
              action.variant === "secondary" && btnSecondary,
              action.variant === "muted" &&
                "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100",
            )}
            onClick={() => onAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}
