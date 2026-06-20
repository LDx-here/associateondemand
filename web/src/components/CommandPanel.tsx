"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgentResultPanel } from "@/components/AgentResultPanel";
import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";
import type { CommandResult } from "@/lib/agent-dispatch";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    label: "Summarize",
    template: (mid: string) => `summarize ${mid}`,
    hint: "Instant briefing — no agent",
  },
  {
    label: "Research",
    template: (mid: string) => `pm:research legal standard and next steps for ${mid}`,
    hint: "Research Agent → memo",
  },
  {
    label: "Draft",
    template: (mid: string) => `draft internal strategy memo for ${mid}`,
    hint: "Drafting Agent → work product",
  },
  {
    label: "Map elements",
    template: (mid: string) => `legal mapping for ${mid}`,
    hint: "Legal Mapping → element table",
  },
  {
    label: "Audit",
    template: (mid: string) => `mass audit ${mid}`,
    hint: "Mass Auditor → readiness report",
  },
] as const;

function matterFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/matters\/(AOD-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function CommandPanel() {
  const pathname = usePathname();
  const contextMatter = useMemo(() => matterFromPath(pathname), [pathname]);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ query?: string; autoDispatch?: boolean }>).detail;
      if (detail?.query) {
        setOpen(true);
        setQuery(detail.query);
        if (detail.autoDispatch) {
          void runSearch(detail.query);
        } else {
          setResult({
            type: "message",
            message: `Ready to run: ${detail.query}`,
          });
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
    setResult(null);
    try {
      const resp = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, matterId: contextMatter ?? undefined }),
      });
      setResult((await resp.json()) as CommandResult);
    } finally {
      setLoading(false);
    }
  }

  function runQuickAction(template: (mid: string) => string) {
    const mid = contextMatter ?? "AOD-1001";
    const text = template(mid);
    setQuery(text);
    void runSearch(text);
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
            Plain-English instructions → PM picks the specialist (research, draft, audit, mapping).
            <span className="block text-slate-500">Summarize / due this week = instant reads, no agent.</span>
          </p>
          {contextMatter ? (
            <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              Active matter: <span className="font-medium">{contextMatter}</span>
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

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map(({ label, template, hint }) => (
              <button
                key={label}
                type="button"
                title={hint}
                disabled={loading}
                className={`${btnSecondary} px-2 py-1.5 text-xs disabled:opacity-50`}
                onClick={() => runQuickAction(template)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="associate-query"
            className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500"
          >
            Your instruction
          </label>
          <textarea
            id="associate-query"
            rows={3}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="summarize this matter · due this week · pm:research …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
        </div>

        <button
          type="button"
          className={`${btnPrimary} disabled:opacity-50`}
          disabled={loading || !query.trim()}
          onClick={() => void runSearch()}
        >
          {loading ? "Working…" : "Run"}
        </button>

        {result?.type === "message" ? <p className="text-xs text-slate-600">{result.message}</p> : null}

        {result?.type === "briefing" ? (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              Briefing ·{" "}
              <Link className={linkMatter} href={`/matters/${result.matterId}`}>
                {result.matterId}
              </Link>
            </p>
            {result.sections.map((section) => (
              <div key={section.heading}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.heading}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                  {section.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {result?.type === "tasks_due" ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Due this week ({result.tasks.length})</p>
            {result.tasks.length === 0 ? (
              <p className="mt-2 text-xs text-slate-600">No tasks due in the next 7 days.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {result.tasks.map((t, i) => (
                  <li key={`${t.matterId}-${i}`}>
                    <Link className={linkMatter} href={`/matters/${t.matterId}`}>
                      {t.matterId}
                    </Link>
                    <span className="text-slate-700"> · {t.description}</span>
                    <span className="block text-slate-500">
                      {t.dueDate ? formatDate(t.dueDate) : "No date"} · {t.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {result?.type === "agent" ? (
          <div className="space-y-2">
            {result.agent ? (
              <p className="text-xs text-slate-600">
                PM routed to{" "}
                <span className="font-medium text-slate-900">{result.agent.replace(/_/g, " ")}</span>
                {result.matterId ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link className={linkMatter} href={`/matters/${result.matterId}`}>
                      {result.matterId}
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
            <AgentResultPanel result={result} />
          </div>
        ) : null}

        {result?.type === "matter" ? (
          <a className={`text-sm ${linkMatter}`} href={`/matters/${result.matter.matterId}`}>
            Open {result.matter.matterId}
          </a>
        ) : null}

        {result?.type === "matters" ? (
          <ul className="space-y-1 text-sm">
            {result.matters.map((m) => (
              <li key={m.matterId}>
                <a className={linkMatter} href={`/matters/${m.matterId}`}>
                  {m.matterId} · {m.clientName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
