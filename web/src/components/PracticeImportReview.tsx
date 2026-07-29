"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { FolderSearch } from "lucide-react";
import { caseTypeFor, daysSinceActivity, type ProposedMatter } from "@/lib/practice-import";
import { btnPrimary } from "@/lib/ui-classes";

type Scan = {
  root: string;
  available: boolean;
  matters: ProposedMatter[];
  reason?: string;
  source?: "drive" | "local" | "none";
  dataStore?: string;
  demoMode?: boolean;
};

type ImportResult = {
  imported: { matterNumber: string; matterId: string; clientName: string }[];
  failed: { matterNumber: string; error: string }[];
  dataStore?: string;
  demoMode?: boolean;
};

/** Quiet long enough to be worth flagging on an open matter. */
const QUIET_DAYS = 30;

export function PracticeImportReview() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/import/practice");
        const data = (await resp.json()) as Scan;
        if (cancelled) return;
        setScan(data);
        // Everything is pre-selected: the attorney reviews and deselects,
        // rather than doing the system's work of picking things one by one.
        setSelected(new Set(data.matters?.map((m) => m.matterNumber) ?? []));
      } catch {
        if (!cancelled) setError("Could not scan the case folder.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(matterNumber: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(matterNumber)) next.delete(matterNumber);
      else next.add(matterNumber);
      return next;
    });
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/import/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterNumbers: [...selected] }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }
      setResult(data as ImportResult);
    } catch {
      setError("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!scan) {
    return <p className="text-sm text-slate-600">Scanning your case folders…</p>;
  }

  if (!scan.available) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Case folder not reachable on this server</p>
        <p className="mt-1">{scan.reason}</p>
        <p className="mt-2 font-mono text-xs text-amber-900 break-all">{scan.root}</p>
        <p className="mt-2 text-xs">
          On production, set <code className="rounded bg-amber-100 px-1">AOD_PRACTICE_DRIVE_FOLDER_ID</code>{" "}
          (folder ID from the Drive URL for &ldquo;03 Clients Active&rdquo;), keep{" "}
          <code className="rounded bg-amber-100 px-1">GOOGLE_SERVICE_ACCOUNT_JSON</code> as inline JSON,
          enable the Google Drive API, and share that folder with the service account email as Viewer.
          Locally you can still use synced Drive (
          <code className="rounded bg-amber-100 px-1">cd web && npm run dev</code> →{" "}
          <code className="rounded bg-amber-100 px-1">/import/practice</code>
          ). Records write to {scan.dataStore ?? "your shared store"} so{" "}
          <a className="underline" href="https://aod-next.vercel.app/matters">
            production Matters
          </a>{" "}
          updates after refresh.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">
            Imported {result.imported.length} matter{result.imported.length === 1 ? "" : "s"}.
          </p>
          {result.demoMode ? (
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
              Wrote to <strong>sample/demo store</strong> — production will not show these. Check
              local <code>.env.local</code> has Google Sheets or Airtable credentials (not{" "}
              <code>AOD_FORCE_DEMO_MODE=true</code>).
            </p>
          ) : (
            <p className="mt-2 text-xs text-emerald-800">
              Saved to <strong>{result.dataStore ?? "shared store"}</strong>. Refresh{" "}
              <a className="underline" href="https://aod-next.vercel.app/matters">
                production Matters
              </a>{" "}
              to see them.
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {result.imported.map((m) => (
              <li key={m.matterNumber}>
                <a className="underline hover:no-underline" href={`/matters/${m.matterId}`}>
                  {m.matterId} — {m.clientName}
                </a>{" "}
                <span className="text-emerald-800">(firm no. {m.matterNumber})</span>
              </li>
            ))}
          </ul>
        </div>
        {result.failed.length > 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            <p className="font-medium">{result.failed.length} could not be imported</p>
            <ul className="mt-2 space-y-1">
              {result.failed.map((f) => (
                <li key={f.matterNumber}>
                  {f.matterNumber} — {f.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (scan.matters.length === 0) {
    return (
      <EmptyState
        icon={FolderSearch}
        title="No client folders recognized."
        description="Folders should be named like 2026-002-Hammond, Jeremiah — a year, a matter number, then the client."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Found <span className="font-semibold text-slate-900">{scan.matters.length}</span> matters in
        your case folders
        {scan.source === "drive" ? " (Google Drive)" : scan.source === "local" ? " (local Drive sync)" : ""}
        . Everything is selected — uncheck anything you do not want, then import.
      </p>
      {scan.demoMode ? (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
          Demo mode is on — imported matters will not appear on production until Google Sheets (or
          Airtable) credentials are configured and <code>AOD_FORCE_DEMO_MODE</code> is unset.
        </p>
      ) : null}

      <ul className="space-y-3">
        {scan.matters.map((m) => {
          const quiet = daysSinceActivity(m, now);
          const isQuiet = quiet !== null && quiet >= QUIET_DAYS;
          return (
            <li
              key={m.matterNumber}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(m.matterNumber)}
                  onChange={() => toggle(m.matterNumber)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium text-slate-900">{m.clientName}</span>
                    <span className="text-xs text-slate-500">{m.matterNumber}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {caseTypeFor(m)}
                    </span>
                    {isQuiet ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-900">
                        quiet {quiet} days
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-slate-600">
                    {m.documents.length} document{m.documents.length === 1 ? "" : "s"}
                    {quiet === null ? " · no activity yet" : ` · last activity ${quiet} days ago`}
                  </p>

                  {m.timeline.length > 0 ? (
                    <ol className="mt-2 space-y-0.5 border-l-2 border-slate-100 pl-3">
                      {m.timeline.map((e, i) => (
                        <li key={`${e.title}-${i}`} className="text-xs text-slate-600">
                          <span className="font-mono text-slate-500">
                            {e.occurredAt.slice(0, 10)}
                          </span>{" "}
                          <span className="font-medium text-slate-800">{e.category}</span> —{" "}
                          {e.title}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || selected.size === 0}
          onClick={() => void runImport()}
        >
          {busy ? "Importing…" : `Import ${selected.size} matter${selected.size === 1 ? "" : "s"}`}
        </button>
        <p className="text-xs text-slate-500">
          Creates matters with a procedural history note. Your files stay where they are.
        </p>
      </div>
    </div>
  );
}
