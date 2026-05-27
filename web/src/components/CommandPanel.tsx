"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";
import type { CommandResult } from "@/lib/agent-dispatch";
import { btnPrimary, linkMatter } from "@/lib/ui-classes";

export function CommandPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ query?: string; autoDispatch?: boolean }>).detail;
      if (detail?.query) {
        setQuery(detail.query);
        if (detail.autoDispatch) {
          void runSearch(detail.query);
        } else {
          setResult({
            type: "message",
            message: `Ready to dispatch: ${detail.query}`,
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
    try {
      const resp = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setResult((await resp.json()) as CommandResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Associate Command Panel</p>
        <p className="text-xs text-slate-500">Search matters or dispatch PM agents (research, pattern, strategy).</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="AOD-1001, pm:research memo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
        />
        <button
          type="button"
          className={`${btnPrimary} disabled:opacity-50`}
          disabled={loading || !query.trim()}
          onClick={() => void runSearch()}
        >
          {loading ? "Working…" : "Run"}
        </button>
        {result?.type === "message" ? <p className="text-xs text-slate-600">{result.message}</p> : null}
        {result?.type === "agent" ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-800">
              {result.agent ?? "agent"} · {result.matterId}
            </p>
            <p className="text-slate-700">{result.summary}</p>
            {result.gaps?.length ? (
              <ul className="list-inside list-disc text-slate-600">
                {result.gaps.slice(0, 5).map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-slate-500">
              {result.complete ? "Complete" : "Needs review"}
              {result.jobId ? ` · job ${result.jobId}` : ""}
            </p>
            <Link className={linkMatter} href={`/matters/${result.matterId}`}>
              Open matter
            </Link>
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
