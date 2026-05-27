import Link from "next/link";

import type { AgentCommandResult } from "@/lib/agent-dispatch";
import { linkMatter } from "@/lib/ui-classes";
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
  const hasGaps = (result.gaps ?? []).length > 0;
  const hasUncertainties = (result.uncertainties ?? []).length > 0;
  const hasManualFlags = (result.manualFlags ?? []).length > 0;
  const hasSources = (result.sources ?? []).length > 0;
  const hasNextSteps = (result.nextSteps ?? []).length > 0;

  const statusLabel = hasManualFlags
    ? "Manual review required"
    : result.complete
      ? "Complete"
      : "Needs review";

  const showSummary = Boolean(result.summary);

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

