"use client";

import { useState } from "react";

import type { AgentCommandResult } from "@/lib/agent-dispatch";
import {
  buildDraftQcChecklist,
  formatDraftQcChecklistText,
  type DraftQcStatus,
} from "@/lib/draft-qc";
import { btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function statusClass(status: DraftQcStatus): string {
  switch (status) {
    case "pass":
      return "text-emerald-800";
    case "fail":
      return "text-rose-800";
    case "warn":
      return "text-amber-900";
    default:
      return "text-slate-700";
  }
}

function statusMark(status: DraftQcStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "warn":
      return "Check";
    default:
      return "You";
  }
}

/** Compact draft QC checklist for Associate panel / agent results. */
export function DraftQcChecklist({
  result,
  compact = false,
}: {
  result: AgentCommandResult;
  compact?: boolean;
}) {
  const items = buildDraftQcChecklist(result);
  const [copied, setCopied] = useState(false);

  if (
    !result.fullMemo?.trim() &&
    !result.documentLintIssues?.length &&
    !result.citationVerification &&
    !result.draftQc &&
    typeof result.firmMemoryApplied !== "boolean" &&
    !result.draftType
  ) {
    return null;
  }

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(formatDraftQcChecklistText(items));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <div
      className={cn(
        "rounded border border-slate-200 bg-white px-2 py-1.5 text-[0.65rem] text-slate-800",
        compact && "max-h-48 overflow-auto",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold uppercase tracking-wide text-slate-500">Draft QC</p>
        <button
          type="button"
          className={cn(btnSecondary, "py-0.5 px-2 text-[0.65rem]")}
          onClick={() => void copyChecklist()}
        >
          {copied ? "Copied" : "Copy checklist"}
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2">
            <span className={cn("w-10 shrink-0 font-semibold", statusClass(item.status))}>
              {statusMark(item.status)}
            </span>
            <span>
              <span className="font-medium text-slate-900">{item.label}</span>
              {item.detail ? <span className="block text-slate-600">{item.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
