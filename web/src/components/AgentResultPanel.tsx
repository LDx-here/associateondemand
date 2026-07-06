"use client";

import Link from "next/link";
import { useState } from "react";

import type { AgentCommandResult } from "@/lib/agent-dispatch";
import { EditableOutputMemo } from "@/components/EditableOutputMemo";
import { btnSecondary, linkMatter } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

type Variant = "full" | "compact";

export function AgentResultPanel({
  result,
  variant = "full",
  className,
}: {
  result: AgentCommandResult;
  variant?: Variant;
  className?: string;
}) {
  const [memoOpen, setMemoOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [citationBusy, setCitationBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [memoContent, setMemoContent] = useState(result.fullMemo?.trim() ?? "");
  const [memoNoteId, setMemoNoteId] = useState(result.noteId);

  // Re-sync when a new command result arrives (e.g. attorney runs another
  // command in the panel). Adjusted during render rather than in a useEffect
  // per https://react.dev/learn/you-might-not-need-an-effect so this doesn't
  // trigger an extra cascading render.
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    setMemoContent(result.fullMemo?.trim() ?? "");
    setMemoNoteId(result.noteId);
  }

  const hasGaps = (result.gaps ?? []).length > 0;
  const hasUncertainties = (result.uncertainties ?? []).length > 0;
  const hasManualFlags = (result.manualFlags ?? []).length > 0;
  const hasSources = (result.sources ?? []).length > 0;
  const hasNextSteps = (result.nextSteps ?? []).length > 0;
  const fullMemo = memoContent.trim();
  const hasFullMemo = Boolean(fullMemo);

  const statusLabel = hasManualFlags
    ? "Manual review required"
    : result.complete
      ? "Complete"
      : "Needs review";

  const showSummary = Boolean(result.summary);

  async function copyFullMemo() {
    if (!fullMemo) return;
    try {
      await navigator.clipboard.writeText(fullMemo);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      // Clipboard may be denied; no noisy logging.
    }
  }

  async function downloadMemoFile() {
    if (!fullMemo || !result.matterId) return;
    setDownloadBusy(true);
    setExportError(null);
    try {
      const isAosBrief = result.draftType === "aos_discretionary_brief";
      const endpoint = isAosBrief ? "/api/drafting/aos-brief-export" : "/api/research/memo-export";
      const payload = isAosBrief
        ? { matterId: result.matterId, memo: fullMemo, format: "docx" }
        : { matterId: result.matterId, memo: fullMemo, format: "docx" };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let message = `Export failed (${r.status})`;
        try {
          const err = (await r.json()) as { error?: string; issues?: string[] };
          if (err.issues?.length) {
            message = `${err.error ?? "Document linter failed"}: ${err.issues.join("; ")}`;
          } else if (err.error) {
            message = err.error;
          }
        } catch {
          message = (await r.text()) || message;
        }
        setExportError(message);
        return;
      }
      const blob = await r.blob();
      const dispo = r.headers.get("Content-Disposition");
      let filename = `${result.matterId}_research_memo.docx`;
      if (dispo) {
        const m = /filename="([^"]+)"/.exec(dispo);
        if (m?.[1]) filename = m[1];
      } else if (blob.type === "text/plain" || blob.type.startsWith("text/")) {
        filename = `${result.matterId}_research_memo.txt`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadBusy(false);
    }
  }

  async function downloadCitationPackage() {
    if (!fullMemo || !result.matterId) return;
    setCitationBusy(true);
    setExportError(null);
    try {
      const r = await fetch("/api/drafting/citation-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId: result.matterId, memo: fullMemo }),
      });
      if (!r.ok) {
        let message = `Citation package failed (${r.status})`;
        try {
          const err = (await r.json()) as { error?: string };
          if (err.error) message = err.error;
        } catch {
          message = (await r.text()) || message;
        }
        setExportError(message);
        return;
      }
      const blob = await r.blob();
      const dispo = r.headers.get("Content-Disposition");
      let filename = `${result.matterId}_citation_package.zip`;
      if (dispo) {
        const m = /filename="([^"]+)"/.exec(dispo);
        if (m?.[1]) filename = m[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCitationBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs",
        variant === "compact" && "shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {result.agent ?? "agent"}
          {result.matterId ? ` · ${result.matterId}` : null}
        </p>
        <StatusBadge status={statusLabel} className="shrink-0" />
      </div>

      {showSummary ? (
        <p className={cn("text-slate-700", variant === "compact" && "line-clamp-3")}>{result.summary}</p>
      ) : null}

      {result.draftType ? (
        <p className="text-[0.65rem] font-medium text-slate-600">
          Draft type: <span className="text-slate-800">{result.draftType.replace(/_/g, " ")}</span>
          {result.documentLintPassed === false ? (
            <span className="ml-2 text-amber-800"> · linter issues — fix before export</span>
          ) : null}
        </p>
      ) : null}

      {result.documentLintIssues?.length ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[0.65rem] text-amber-950">
          <p className="font-semibold">Document linter</p>
          <ul className="mt-1 list-inside list-disc">
            {result.documentLintIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.citationVerification ? (
        <div className="space-y-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[0.65rem] text-sky-950">
          <p>Citation package: {result.citationVerification}</p>
          {fullMemo && result.matterId ? (
            <button
              type="button"
              className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
              disabled={citationBusy}
              onClick={() => void downloadCitationPackage()}
            >
              {citationBusy ? "Building ZIP…" : "Download citation package"}
            </button>
          ) : null}
        </div>
      ) : null}

      {exportError ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[0.65rem] text-rose-900" role="alert">
          {exportError}
        </p>
      ) : null}

      {result.fullMemoTruncated ? (
        <p className="text-[0.65rem] font-medium text-amber-800">Full memo was truncated for transport size.</p>
      ) : null}

      {hasFullMemo ? (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-left text-[0.65rem] font-semibold uppercase tracking-wide text-sky-800 underline-offset-2 hover:underline"
              onClick={() => setMemoOpen((o) => !o)}
              aria-expanded={memoOpen}
            >
              {memoOpen ? "Hide full memo" : "View full memo"}
            </button>
            <button type="button" className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")} onClick={() => void copyFullMemo()}>
              {copyDone ? "Copied" : "Copy full memo"}
            </button>
            {result.matterId ? (
              <button
                type="button"
                className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
                disabled={downloadBusy}
                onClick={() => void downloadMemoFile()}
              >
                {downloadBusy ? "Downloading…" : "Download memo"}
              </button>
            ) : null}
          </div>
          {memoOpen ? (
            <EditableOutputMemo
              content={fullMemo}
              matterId={result.matterId}
              agent={result.agent}
              noteId={memoNoteId}
              compact
              onSaved={({ content, noteId }) => {
                setMemoContent(content);
                if (noteId) setMemoNoteId(noteId);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {hasNextSteps ? (
        <div className="mt-1">
          <p className="mb-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            Next steps
          </p>
          <ul className="list-inside list-disc text-slate-700">
            {(variant === "compact" ? result.nextSteps!.slice(0, 2) : result.nextSteps!).map((step) => (
              <li key={step}>{step}</li>
            ))}
            {variant === "compact" && result.nextSteps!.length > 2 ? (
              <li className="text-slate-500">+ {result.nextSteps!.length - 2} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {(hasGaps || hasUncertainties) && (
        <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-2">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-amber-700">
            Gaps and uncertainties
          </p>
          <ul className="space-y-0.5 text-slate-800">
            {(result.gaps ?? []).map((gap) => (
              <li key={`gap-${gap}`} className="list-inside list-disc">
                {gap}
              </li>
            ))}
            {(result.uncertainties ?? []).map((u) => (
              <li key={`uncertainty-${u}`} className="list-inside list-disc">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasManualFlags ? (
        <div className="mt-1 rounded-md border border-rose-200 bg-rose-50 p-2">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-rose-700">
            Manual flags
          </p>
          <ul className="space-y-0.5 text-rose-800">
            {result.manualFlags!.map((flag) => (
              <li key={flag} className="list-inside list-disc">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSources ? (
        <div className="mt-1">
          <p className="mb-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            Sources
          </p>
          <ul className="space-y-0.5 text-slate-700">
            {(variant === "compact" ? result.sources!.slice(0, 3) : result.sources!).map((src) => (
              <li key={src.label} className="flex items-center gap-1">
                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  >
                    {src.label}
                  </a>
                ) : (
                  <span className="truncate">{src.label}</span>
                )}
              </li>
            ))}
            {variant === "compact" && result.sources!.length > 3 ? (
              <li className="text-slate-500">+ {result.sources!.length - 3} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {result.matterId ? (
        <div className="mt-1 flex justify-between text-[0.7rem] text-slate-500">
          <p>
            {result.complete ? "Agent run complete" : "Agent run needs review"}
            {result.jobId ? ` · job ${result.jobId}` : ""}
          </p>
          <Link className={linkMatter} href={`/matters/${result.matterId}`}>
            Open matter
          </Link>
        </div>
      ) : null}
    </div>
  );
}
