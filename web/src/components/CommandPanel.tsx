"use client";

import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CommandResultView } from "@/components/CommandResultView";
import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";
import type { CommandResult } from "@/lib/agent-dispatch";
import { emitMatterReviewRefresh } from "@/lib/matter-review-events";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const QUICK_ACTIONS = [
  { label: "Summarize", template: (mid: string) => `summarize ${mid}`, needsMatter: true },
  { label: "Research", template: (mid: string) => `pm:research legal standard for ${mid}`, needsMatter: true },
  { label: "Draft", template: (mid: string) => `draft internal memo for ${mid}`, needsMatter: true },
  { label: "Due week", template: () => `due this week`, needsMatter: false },
  { label: "Overdue", template: () => `overdue`, needsMatter: false },
  { label: "Audit", template: (mid: string) => `mass audit ${mid}`, needsMatter: true },
] as const;

type HistoryEntry = {
  id: string;
  query: string;
  result: CommandResult;
  at: string;
};

function matterFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/matters\/(AOD-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CommandPanel({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const contextMatter = useMemo(() => matterFromPath(pathname), [pathname]);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

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
            message: "Open a matter first — quick actions need matter context.",
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
          title="Open Associate panel"
          className="flex h-full flex-col items-center gap-2 py-4 text-slate-600 hover:bg-slate-50"
          onClick={() => setOpen(true)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
            Associate
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Associate</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Reads & notes: summarize, due/overdue, <code className="text-slate-800">note:</code>. Agents:
            research, draft, audit, mapping.
          </p>
          {contextMatter ? (
            <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              Matter: <span className="font-medium">{contextMatter}</span>
            </p>
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
              No runs yet. Try <strong>Summarize</strong> on an open matter, or type{" "}
              <code className="text-slate-700">note: follow-up call scheduled</code>.
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
          <div className="flex flex-wrap gap-1">
            {QUICK_ACTIONS.map(({ label, template, needsMatter }) => (
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
            placeholder="note: … · summarize · pm:research …"
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
