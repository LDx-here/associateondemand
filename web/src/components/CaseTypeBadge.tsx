import { cn } from "@/lib/utils";

const CASE_TYPE_STYLES: { match: RegExp; className: string }[] = [
  {
    match: /asylum|withholding|cat/i,
    className: "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  },
  {
    match: /cancellation/i,
    className: "bg-amber-50 text-amber-900 ring-amber-600/20",
  },
  {
    match: /adjustment|waiver|i-485/i,
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  },
  {
    match: /employment|h-1b|h1b/i,
    className: "bg-sky-50 text-sky-800 ring-sky-600/20",
  },
];

function styleForCaseType(caseType: string): string {
  const hit = CASE_TYPE_STYLES.find(({ match }) => match.test(caseType));
  return hit?.className ?? "bg-slate-50 text-slate-700 ring-slate-500/20";
}

export function CaseTypeBadge({ caseType }: { caseType: string }) {
  if (!caseType.trim()) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={cn(
        "inline-flex max-w-[200px] truncate rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styleForCaseType(caseType),
      )}
      title={caseType}
    >
      {caseType}
    </span>
  );
}

export function CountryBadge({ country }: { country: string }) {
  if (!country.trim()) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-400/30">
      {country}
    </span>
  );
}
