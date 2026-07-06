import { Brain } from "lucide-react";

/** Explains overflow counsel learns firm style via Firm Memory (Strategy Patterns). */
export function FirmMemoryBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900 ring-1 ring-violet-200"
      title="AssociateOnDemand learns your firm's writing style from samples and edits you save — so overflow work reads like your in-house associate."
    >
      <Brain className="h-3 w-3 shrink-0" aria-hidden />
      {compact ? "Firm Memory" : "Firm Memory — we learn your style"}
    </span>
  );
}
