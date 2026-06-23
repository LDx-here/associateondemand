"use client";

import Link from "next/link";

import type { CommandResult } from "@/lib/agent-dispatch";
import { AgentResultPanel } from "@/components/AgentResultPanel";
import { linkMatter } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

export function CommandResultView({
  result,
  compact = false,
}: {
  result: CommandResult;
  compact?: boolean;
}) {
  if (result.type === "message") {
    return <p className="text-xs text-slate-600">{result.message}</p>;
  }

  if (result.type === "note_created") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
        <p className="font-medium">Note saved on {result.matterId}</p>
        <p className="mt-1 text-emerald-900">{result.content}</p>
        <Link className={`mt-2 inline-block ${linkMatter}`} href={`/matters/${result.matterId}`}>
          Open matter timeline
        </Link>
      </div>
    );
  }

  if (result.type === "briefing") {
    return (
      <div className={`space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 ${compact ? "text-xs" : "text-sm"}`}>
        <p className="font-medium text-slate-900">
          Briefing ·{" "}
          <Link className={linkMatter} href={`/matters/${result.matterId}`}>
            {result.matterId}
          </Link>
        </p>
        {result.sections.map((section) => (
          <div key={section.heading}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {section.heading}
            </p>
            <ul className="mt-0.5 space-y-0.5 text-xs text-slate-700">
              {section.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "tasks_due") {
    return (
      <div className={`rounded-md border border-slate-200 bg-slate-50 p-3 ${compact ? "text-xs" : "text-sm"}`}>
        <p className="font-medium text-slate-900">
          {result.label ?? "Due this week"} ({result.tasks.length})
        </p>
        {result.tasks.length === 0 ? (
          <p className="mt-1 text-xs text-slate-600">No tasks due in the next 7 days.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-xs">
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
    );
  }

  if (result.type === "agent") {
    const needsInbox =
      (result.gaps?.length ?? 0) > 0 ||
      (result.manualFlags?.length ?? 0) > 0 ||
      result.complete === false;
    return (
      <div className="space-y-2">
        {result.agent ? (
          <p className="text-xs text-slate-600">
            PM → <span className="font-medium text-slate-900">{result.agent.replace(/_/g, " ")}</span>
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
        <AgentResultPanel result={result} variant={compact ? "compact" : "full"} />
        {needsInbox ? (
          <Link className={`text-xs ${linkMatter}`} href="/inbox">
            Review in PM Inbox →
          </Link>
        ) : null}
      </div>
    );
  }

  if (result.type === "matter") {
    return (
      <a className={`text-sm ${linkMatter}`} href={`/matters/${result.matter.matterId}`}>
        Open {result.matter.matterId}
      </a>
    );
  }

  if (result.type === "matters") {
    return (
      <ul className="space-y-1 text-sm">
        {result.matters.map((m) => (
          <li key={m.matterId}>
            <a className={linkMatter} href={`/matters/${m.matterId}`}>
              {m.matterId} · {m.clientName}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return null;
}
