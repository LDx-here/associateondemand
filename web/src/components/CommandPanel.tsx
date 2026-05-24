"use client";

import { useEffect, useState } from "react";

import { COMMAND_PREFILL_EVENT } from "@/lib/case-assessment";

type CommandResult =
  | { type: "matter"; matter: { matterId: string } }
  | { type: "matters"; matters: Array<{ matterId: string; clientName: string }> }
  | { type: "message"; message: string }
  | { type: "empty" };

export function CommandPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      if (detail?.query) {
        setQuery(detail.query);
        setResult({ type: "message", message: `Prefilled from case assessment: "${detail.query}"` });
      }
    }
    window.addEventListener(COMMAND_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(COMMAND_PREFILL_EVENT, onPrefill);
  }, []);

  async function runSearch() {
    setLoading(true);
    try {
      const resp = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      setResult((await resp.json()) as CommandResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Associate Command Panel</p>
        <p className="text-xs text-slate-500">Airtable search only (Phase 4 adds AI routing).</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="AOD-1001, due this week…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <button
          type="button"
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          disabled={loading || !query.trim()}
          onClick={runSearch}
        >
          {loading ? "Searching…" : "Search matters"}
        </button>
        {result?.type === "message" ? <p className="text-xs text-slate-600">{result.message}</p> : null}
        {result?.type === "matter" ? (
          <a className="text-sm text-sky-700 underline" href={`/matters/${result.matter.matterId}`}>
            Open {result.matter.matterId}
          </a>
        ) : null}
        {result?.type === "matters" ? (
          <ul className="space-y-1 text-sm">
            {result.matters.map((m) => (
              <li key={m.matterId}>
                <a className="text-sky-700 hover:underline" href={`/matters/${m.matterId}`}>
                  {m.matterId} — {m.clientName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
