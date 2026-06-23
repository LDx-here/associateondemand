import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-slate-500",
        className,
      )}
    >
      <Icon className="h-7 w-7 text-slate-400" aria-hidden />
      <p className="font-medium text-slate-700">{title}</p>
      <p className="max-w-sm text-slate-500">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
