"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CommandResultView } from "@/components/CommandResultView";
import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";
import type { CommandResult } from "@/lib/agent-dispatch";
import { deliverableById } from "@/lib/deliverable-catalog";
import { emitMatterReviewRefresh } from "@/lib/matter-review-events";
import type { InboxItem, Matter } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

type HistoryEntry = {
  id: string;
  query: string;
  result: CommandResult;
  at: string;
};

type QuickAction = {
  label: string;
  template: (mid: string) => string;
  needsMatter: boolean;
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

function suggestedPrompts(
  matter: Matter | null,
  openAssignment: InboxItem | null,
): QuickAction[] {
  if (!matter) {
    return [
      { label: "New assignment", template: () => "help me submit a new overflow assignment", needsMatter: false },
      { label: "Check inbox", template: () => "what is ready for review", needsMatter: false },
    ];
  }

  const caseType = (matter.caseType ?? "").toLowerCase();
  const deliverable = deliverableLabel(openAssignment?.deliverableType);
  const status = openAssignment?.status;

  const prompts: QuickAction[] = [
    { label: "Summarize facts", template: (mid) => `summarize ${mid}`, needsMatter: true },
  ];

  if (caseType.includes("immigration")) {
    prompts.push(
      { label: "AOS brief", template: (mid) => `draft aos discretionary brief for ${mid}`, needsMatter: true },
      { label: "Research waiver", template: (mid) => `pm:research extreme hardship standard for ${mid}`, needsMatter: true },
    );
  } else if (caseType.includes("personal") || caseType.includes("injury") || caseType.includes("pi")) {
    prompts.push(
      { label: "Demand letter", template: (mid) => `draft demand letter for ${mid}`, needsMatter: true },
      { label: "Damages research", template: (mid) => `pm:research damages for ${mid}`, needsMatter: true },
    );
  } else {
    prompts.push(
      { label: "Research", template: (mid) => `pm:research legal standard for ${mid}`, needsMatter: true },
      { label: "Draft memo", template: (mid) => `draft internal memo for ${mid}`, needsMatter: true },
    );
  }

  if (status === "Ready for review" && deliverable) {
    prompts.unshift({
      label: "Prep review",
      template: (mid) => `summarize ${deliverable} draft for ${mid} before I sign off`,
      needsMatter: true,
    });
  } else if (status === "In progress" && deliverable) {
    prompts.unshift({
      label: "Check progress",
      template: (mid) => `status of ${deliverable} assignment on ${mid}`,
      needsMatter: true,
    });
  }

  return prompts.slice(0, 6);
}

export function CommandPanel({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const contextMatter = useMemo(() => matterFromPath(pathname), [pathname]);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [assignments, setAssignments] = useState<InboxItem[]>([]);

  useEffect(() => {
    if (!contextMatter) {
      setMatter(null);
      setAssignments([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [matterResp, assignResp] = await Promise.all([
          fetch(`/api/matters/${encodeURIComponent(contextMatter)}`),
          fetch(`/api/matters/${encodeURIComponent(contextMatter)}/assignments`),
        ]);
        if (cancelled) return;
        if (matterResp.ok) {
          const data = (await matterResp.json()) as { matter?: Matter };
          setMatter(data.matter ?? null);
        }
        if (assignResp.ok) {
          const data = (await assignResp.json()) as { assignments?: InboxItem[] };
          setAssignments(data.assignments ?? []);
        }
      } catch {
        if (!cancelled) {
          setMatter(null);
          setAssignments([]);
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

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ query?: string; autoDispatch?: boolean }>).detail;
      if (detail?.query) {
        setOpen(true);
        setQuery(detail.query);
        if (detail.autoDispatch) {
          void runSearch(detail.query);
        }
      }
    }
    window.addEventListener(COMMAND_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(COMMAND_PREFILL_EVENT, onPrefill);
  }, []);

  async function runSearch(override?: string) {
    const q = (override ?? query).trim();
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
        setQuery("");
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
      setQuery("");
    } finally {
      setLoading(false);
    }
  }

  function runQuickAction(template: (mid: string) => string, needsMatter: boolean) {
    if (needsMatter && !contextMatter) {
      setHistory((prev) => [
        {
          id: `${Date.now()}`,
          query: template(""),
          result: {
            type: "message" as const,
            message: "Open a matter first — suggested actions need matter context.",
          },
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 20));
      return;
    }
    void runSearch(template(contextMatter ?? ""));
  }

  if (!open) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-l border-slate-200 bg-white">
        <button
          type="button"
          title="Open overflow counsel panel"
          className="flex h-full flex-col items-center gap-2 py-4 text-slate-600 hover:bg-slate-50"
          onClick={() => setOpen(true)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
            RMV
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Overflow counsel
          </p>
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
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Capacity relief from verified overflow counsel. Open a matter for context-aware
              suggestions, or submit a new assignment.
            </p>
          )}
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
              What would you like RMV to work on? Try a suggested action below, or type{" "}
              <code className="text-slate-700">note: client follow-up scheduled</code>.
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

        <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-3">
          {!contextMatter ? (
            <Link href="/assignments/new" className={`${btnSecondary} block w-full px-2 py-1.5 text-center text-[11px]`}>
              Submit new assignment
            </Link>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {quickActions.map(({ label, template, needsMatter }) => (
              <button
                key={label}
                type="button"
                disabled={loading || (needsMatter && !contextMatter)}
                title={needsMatter && !contextMatter ? "Open a matter first" : undefined}
                className={`${btnSecondary} px-2 py-1 text-[11px] disabled:opacity-50`}
                onClick={() => runQuickAction(template, needsMatter)}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            id="associate-query"
            rows={2}
            className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="What would you like RMV to work on?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
          <button
            type="button"
            className={`${btnPrimary} w-full disabled:opacity-50`}
            disabled={loading || !query.trim()}
            onClick={() => void runSearch()}
          >
            {loading ? "Working…" : "Run"}
          </button>
        </div>
      </div>
    </aside>
  );
}
