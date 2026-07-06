"use client";

import { useState } from "react";

import type { AgentCommandResult } from "@/lib/agent-dispatch";
import { DeliverableReadyInline } from "@/components/DeliverableReadyInline";
import { EditableOutputMemo } from "@/components/EditableOutputMemo";
import { btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/** Holds memo edit state; remount via `key` when upstream agent result changes. */
export function AgentResultMemoSection({
  result,
  assignmentId,
  matterContext,
  demoMode,
  onReviewUpdated,
}: {
  result: AgentCommandResult;
  assignmentId?: string;
  matterContext?: boolean;
  demoMode?: boolean;
  onReviewUpdated?: () => void;
}) {
  const initialMemo = result.fullMemo?.trim() ?? "";
  const [memoOpen, setMemoOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [memoContent, setMemoContent] = useState(initialMemo);
  const [memoNoteId, setMemoNoteId] = useState(result.noteId);
  const [showPostSaveAction, setShowPostSaveAction] = useState(false);

  const fullMemo = memoContent.trim();
  const hasFullMemo = Boolean(fullMemo);

  async function copyFullMemo() {
    if (!fullMemo) return;
    try {
      await navigator.clipboard.writeText(fullMemo);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      /* Clipboard may be denied */
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

  if (!hasFullMemo) return null;

  return (
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
      {exportError ? (
        <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[0.65rem] text-rose-900" role="alert">
          {exportError}
        </p>
      ) : null}
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
            if (matterContext && (result.deliverableReady || assignmentId)) {
              setShowPostSaveAction(true);
            }
            onReviewUpdated?.();
          }}
        />
      ) : null}
      {showPostSaveAction && matterContext && result.matterId ? (
        <DeliverableReadyInline
          matterId={result.matterId}
          assignmentId={assignmentId}
          compact
          demoMode={demoMode}
          onAdvanced={() => {
            setShowPostSaveAction(false);
            onReviewUpdated?.();
          }}
        />
      ) : null}
    </div>
  );
}
