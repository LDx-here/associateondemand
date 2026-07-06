"use client";

import { AlertTriangle, Bot } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import {
  alertActionLabel,
  alertActionsForItem,
  type AlertAction,
} from "@/lib/inbox-alert-actions";
import { emitMatterReviewRefresh } from "@/lib/matter-review-events";
import type { InboxItem } from "@/lib/types";
import { btnPrimary, btnSecondary, linkMatter } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type ResolveTarget = {
  item: InboxItem;
  action: AlertAction;
};

type Props = {
  item: InboxItem;
  demoMode?: boolean;
  compact?: boolean;
  /** Hide secondary inbox link when matter page already handles the action. */
  showInboxLink?: boolean;
  onResolved?: () => void;
};

export function AgentAlertInline({
  item,
  demoMode = false,
  compact = false,
  showInboxLink = false,
  onResolved,
}: Props) {
  const { showToast } = useToast();
  const [target, setTarget] = useState<ResolveTarget | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function open(action: AlertAction) {
    setTarget({ item, action });
    setNote("");
    setError(null);
  }

  function close() {
    setTarget(null);
    setNote("");
    setError(null);
  }

  async function submit() {
    if (!target) return;
    const trimmed = note.trim();
    if (target.action.noteRequired && !trimmed) {
      setError("A note is required for this action.");
      return;
    }
    setError(null);
    const status = target.action.resolvedStatus;
    const resolution = trimmed || target.action.label;

    if (demoMode) {
      setResolved(true);
      close();
      showToast(
        `Alert ${alertActionLabel(status).toLowerCase()} — ${item.title || item.agent}.`,
        "success",
      );
      onResolved?.();
      if (item.matterId) emitMatterReviewRefresh(item.matterId);
      return;
    }

    startTransition(async () => {
      const resp = await fetch(`/api/inbox/${target.item.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          status,
          option: target.action.option,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setError(text || `Could not update alert (${resp.status})`);
        showToast("Could not update agent alert.", "error");
        return;
      }
      const data = (await resp.json()) as {
        item: InboxItem;
        pmResume?: { error?: string; skipped?: boolean };
      };
      setResolved(true);
      close();
      const label = alertActionLabel(status);
      if (target.action.resumesAgent && data.pmResume?.error) {
        showToast(`Alert ${label.toLowerCase()}, but agent resume failed: ${data.pmResume.error}`, "error");
      } else if (target.action.resumesAgent) {
        showToast(`Agent resumed on ${item.matterId || "matter"}.`, "success");
      } else {
        showToast(`Alert ${label.toLowerCase()} — ${item.title || item.agent}.`, "success");
      }
      onResolved?.();
      if (item.matterId) emitMatterReviewRefresh(item.matterId);
    });
  }

  if (resolved || item.status !== "Pending") return null;

  const actions = alertActionsForItem(item.options);

  return (
    <>
      <article
        className={cn(
          "rounded-md border border-amber-200/80 bg-amber-50/40",
          compact ? "p-2.5" : "p-3",
        )}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-md bg-amber-50 p-1 text-amber-700 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="h-3 w-3" aria-hidden />
            </span>
            <div>
              <h4 className={cn("font-semibold text-slate-900", compact ? "text-xs" : "text-sm")}>
                {item.title || "Agent needs input"}
              </h4>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                <Bot className="h-3 w-3" aria-hidden />
                {item.agent}
              </p>
            </div>
          </div>
          <StatusBadge status="Pending" />
        </header>

        {item.whatNeeded ? (
          <p className={cn("mt-2 text-slate-800", compact ? "text-xs" : "text-sm")}>
            {item.whatNeeded}
          </p>
        ) : null}

        {item.whatTried && !compact ? (
          <p className="mt-1 text-xs text-slate-600">{item.whatTried}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <button
              key={action.option}
              type="button"
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                action.variant === "primary" && btnPrimary,
                action.variant === "secondary" && btnSecondary,
                action.variant === "muted" &&
                  "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}
              onClick={() => open(action)}
            >
              {action.label}
            </button>
          ))}
        </div>

        {showInboxLink ? (
          <Link href="/inbox" className={`mt-2 inline-block text-[10px] ${linkMatter}`}>
            View all alerts in inbox
          </Link>
        ) : null}
      </article>

      {target ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{target.action.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{target.action.subtitle}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {target.item.title || target.item.agent}
              {target.item.matterId ? (
                <>
                  {" · "}
                  <Link href={`/matters/${target.item.matterId}`} className={linkMatter}>
                    {target.item.matterId}
                  </Link>
                </>
              ) : null}
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">{target.action.noteLabel}</span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={target.action.notePlaceholder}
              />
            </label>
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={close} disabled={isPending}>
                Cancel
              </button>
              <button
                type="button"
                className={cn(btnPrimary, "disabled:opacity-60")}
                onClick={() => void submit()}
                disabled={isPending}
              >
                {isPending ? "Updating…" : target.action.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Build a minimal InboxItem from command-panel agent result when inbox row id is known. */
export function inboxItemFromAgentResult(
  result: {
    inboxItemId?: string;
    matterId?: string;
    agent?: string;
    summary?: string;
    gaps?: string[];
    manualFlags?: string[];
    alertOptions?: string[];
  },
  fallbackTitle = "Agent needs input",
): InboxItem | null {
  if (!result.inboxItemId) return null;
  const gapText = [...(result.gaps ?? []), ...(result.manualFlags ?? [])].filter(Boolean);
  return {
    id: result.inboxItemId,
    title: fallbackTitle,
    matterId: result.matterId ?? "",
    agent: result.agent ?? "pm_orchestrator",
    whatTried: result.summary ?? "",
    whatNeeded: gapText.length
      ? `Agent paused. Provide guidance on:\n- ${gapText.slice(0, 3).join("\n- ")}`
      : "Attorney review required.",
    options: result.alertOptions ?? ["Approve", "Reject", "Modify", "Defer"],
    followUpSteps: [],
    status: "Pending",
    resolution: "",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    kind: "agent_flag",
  };
}
