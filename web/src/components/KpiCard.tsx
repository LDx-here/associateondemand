import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "positive" | "attention";

const toneStyles: Record<KpiTone, { ring: string; icon: string; value: string }> = {
  neutral: {
    ring: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-900",
  },
  positive: {
    ring: "border-emerald-200 bg-emerald-50/40",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-900",
  },
  attention: {
    ring: "border-amber-200 bg-amber-50/40",
    icon: "bg-amber-100 text-amber-800",
    value: "text-amber-950",
  },
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  href?: Route;
}) {
  const styles = toneStyles[tone];
  const inner = (
    <>
      <div
        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", styles.icon)}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums", styles.value)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </>
  );
  const className = cn("flex gap-3 rounded-lg border p-4 shadow-sm", styles.ring, href && "transition hover:shadow-md");
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
