import { Brain } from "lucide-react";
import Link from "next/link";

/** Explains overflow counsel learns firm style via Firm Memory (Strategy Patterns). */
export function FirmMemoryBadge({
  compact = false,
  linked = false,
}: {
  compact?: boolean;
  linked?: boolean;
}) {
  const label = compact ? "Firm Memory" : "Firm Memory — we learn your style";
  const className =
    "inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900 ring-1 ring-violet-200";

  const inner = (
    <>
      <Brain className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </>
  );

  if (linked) {
    return (
      <Link
        href="/templates#firm-memory"
        className={`${className} hover:bg-violet-100`}
        title="AssociateOnDemand learns your firm's writing style from samples and edits you save — so overflow work reads like your in-house associate."
      >
        {inner}
      </Link>
    );
  }

  return (
    <span
      className={className}
      title="AssociateOnDemand learns your firm's writing style from samples and edits you save — so overflow work reads like your in-house associate."
    >
      {inner}
    </span>
  );
}
