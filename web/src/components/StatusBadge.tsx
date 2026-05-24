import { cn } from "@/lib/utils";

const palette: Record<string, string> = {
  "In Progress": "bg-sky-100 text-sky-800",
  Intake: "bg-amber-100 text-amber-900",
  Closed: "bg-slate-200 text-slate-700",
  "Pending Filing": "bg-violet-100 text-violet-900",
  "To Do": "bg-slate-100 text-slate-800",
  Done: "bg-emerald-100 text-emerald-900",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", palette[status] ?? "bg-slate-100")}>
      {status}
    </span>
  );
}
