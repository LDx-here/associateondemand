"use client";

import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CommandResultView } from "@/components/CommandResultView";
import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";
import type { CommandResult } from "@/lib/agent-dispatch";
import { deliverableById } from "@/lib/deliverable-catalog";
import { emitMatterReviewRefresh } from "@/lib/matter-review-events";
import type { InboxItem, Matter } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";

type HistoryEntry = {
  id: string;
  query: string;
  result: CommandResult;
  at: string;
};

type QuickAction = {
  label: string;
  template: (mid: string) => string;
};

function matterFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/matters\/(AOD-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function deliverableLabel(id?: string): string | undefined {
  if (!id) return undefined;
  return deliverableById(id)?.name ?? id.replace(/-/g, " ");
}

function suggestedPrompts(matter: Matter | null, openAssignment: InboxItem | null): QuickAction[] {
  if (!matter) return [];

  const caseType = (matter.caseType ?? "").toLowerCase();
  const deliverable = deliverableLabel(openAssignment?.deliverableType);
  const status = openAssignment?.status;
  const mid = matter.matterId;

  const prompts: QuickAction[] = [
    { label: "Summarize facts", template: () => `summarize ${mid}` },
  ];

  if (caseType.includes("immigration")) {
    prompts.push(
      { label: "AOS brief", template: () => `draft aos discretionary brief for ${mid}` },
      { label: "Research waiver", template: () => `pm:research extreme hardship standard for ${mid}` },
    );
  } else if (caseType.includes("personal") || caseType.includes("injury") || caseType.includes("pi")) {
    prompts.push(
      { label: "Demand letter", template: () => `draft demand letter for ${mid}` },
      { label: "Damages research", template: () => `pm:research damages for ${mid}` },
    );
  } else {
    prompts.push(
      { label: "Research", template: () => `pm:research legal standard for ${mid}` },
      { label: "Draft memo", template: () => `draft internal memo for ${mid}` },
    );
  }

  if (status === "Ready for review" && deliverable) {
    prompts.unshift({
      label: "Prep review",
      template: () => `summarize ${deliverable} draft for ${mid} before I sign off`,
    });
  } else if (status === "In progress" && deliverable) {
    prompts.unshift({
      label: "Check progress",
      template: () => `status of ${deliverable} assignment on ${mid}`,
    });
  }

  return prompts.slice(0, 6);
}

export function CommandPanel({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const contextMatter = useMemo(() => matterFromPath(pathname), [pathname]);
  const [open, setOpen] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [matterData, setMatterData] = useState<{
    id: string;
    matter: Matter | null;
    assignments: InboxItem[];
  } | null>(null);

  const matter = contextMatter && matterData?.id === contextMatter ? matterData.matter : null;
  const assignments =
    contextMatter && matterData?.id === contextMatter ? matterData.assignments : [];

  useEffect(() => {
    if (!contextMatter) return;

    let cancelled = false;
    void (async () => {
      try {
        const [matterResp, assignResp] = await Promise.all([
          fetch(`/api/matters/${encodeURIComponent(contextMatter)}`),
          fetch(`/api/matters/${encodeURIComponent(contextMatter)}/assignments`),
        ]);
        if (cancelled) return;
        const nextMatter = matterResp.ok
          ? ((await matterResp.json()) as { matter?: Matter }).matter ?? null
          : null;
        const nextAssignments = assignResp.ok
          ? ((await assignResp.json()) as { assignments?: InboxItem[] }).assignments ?? []
          : [];
        setMatterData({
          id: contextMatter,
          matter: nextMatter,
          assignments: nextAssignments,
        });
      } catch {
        if (!cancelled) {
          setMatterData({ id: contextMatter, matter: null, assignments: [] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contextMatter]);

  const openAssignment = useMemo(
    () =>
      assignments.find((item) =>
        ["Submitted", "In progress", "Ready for review", "Returned"].includes(item.status),
      ) ?? assignments[0] ?? null,
    [assignments],
  );

  const quickActions = useMemo(
    () => suggestedPrompts(matter, openAssignment),
    [matter, openAssignment],
  );

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      try {
        const resp = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, matterId: contextMatter ?? undefined }),
        });
        if (!resp.ok) {
          let message = `Request failed (${resp.status})`;
          try {
            const err = (await resp.json()) as { error?: string; message?: string };
            message = err.error ?? err.message ?? message;
          } catch {
            message = (await resp.text()) || message;
          }
          setHistory((prev) => [
            {
              id: `${Date.now()}`,
              query: q,
              result: { type: "message" as const, message },
              at: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 20));
          return;
        }
        const result = (await resp.json()) as CommandResult;
        setHistory((prev) => [
          { id: `${Date.now()}`, query: q, result, at: new Date().toISOString() },
          ...prev,
        ].slice(0, 20));
        if (result.type === "agent" && contextMatter && result.matterId === contextMatter) {
          emitMatterReviewRefresh(contextMatter);
        }
      } finally {
        setLoading(false);
      }
    },
    [contextMatter],
  );

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ query?: string; autoDispatch?: boolean }>).detail;
      if (detail?.query && detail.autoDispatch) {
        setOpen(true);
        void runSearch(detail.query);
      }
    }
    window.addEventListener(COMMAND_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(COMMAND_PREFILL_EVENT, onPrefill);
  }, [runSearch]);

  if (!contextMatter && history.length === 0) {
    return null;
  }

  if (!open) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-l border-slate-200 bg-white">
        <button
          type="button"
          title="Open draft review panel"
          className="flex h-full flex-col items-center gap-2 py-4 text-slate-600 hover:bg-slate-50"
          onClick={() => setOpen(true)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
            Review
          </span>
        </button>
      </aside>
    );
  }

  const deliverableName = deliverableLabel(openAssignment?.deliverableType);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Draft review</p>
          {contextMatter && matter ? (
            <div className="mt-2 space-y-1 rounded-md bg-slate-50 px-2 py-2">
              <p className="truncate text-sm font-medium text-slate-900">
                {matter.title || contextMatter}
              </p>
              <p className="text-xs text-slate-600">
                {contextMatter}
                {matter.caseType ? ` · ${matter.caseType}` : ""}
              </p>
              {openAssignment ? (
                <p className="text-xs text-slate-600">
                  {deliverableName ?? "Assignment"} —{" "}
                  <span className="font-medium">{openAssignment.status}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500">No open overflow assignment on this matter.</p>
              )}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          title="Collapse panel"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          onClick={() => setOpen(false)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">
              Agent drafts and review results appear here after you run work from the matter tabs.
            </p>
          ) : (
            history.map((entry) => (
              <article key={entry.id} className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm">
                <p className="text-[10px] text-slate-400">{formatTime(entry.at)}</p>
                <p className="text-xs font-medium text-slate-800">{entry.query}</p>
                <div className="mt-2">
                  <CommandResultView
                    result={entry.result}
                    compact
                    contextMatter={contextMatter}
                    demoMode={demoMode}
                    onReviewUpdated={() => {
                      if (contextMatter) emitMatterReviewRefresh(contextMatter);
                    }}
                  />
                </div>
              </article>
            ))
          )}
        </div>

        {contextMatter && quickActions.length > 0 ? (
          <div className="border-t border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-1">
              {quickActions.map(({ label, template }) => (
                <button
                  key={label}
                  type="button"
                  disabled={loading}
                  className={`${btnSecondary} px-2 py-1 text-[11px] disabled:opacity-50`}
                  onClick={() => void runSearch(template(contextMatter))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
