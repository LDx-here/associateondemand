import Link from "next/link";
import { BookOpen } from "lucide-react";

import { CommandPanel } from "@/components/CommandPanel";
import { SidebarNav } from "@/components/SidebarNav";

export function AppShell({
  children,
  demoMode,
}: {
  children: React.ReactNode;
  demoMode: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900">
      {demoMode ? (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
          Demo data — add AIRTABLE_PAT to web/.env.local
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-5">
            <Link className="flex items-center gap-2 font-semibold text-slate-900" href="/dashboard">
              <BookOpen className="h-5 w-5 text-sky-600" aria-hidden />
              AssociateOnDemand
            </Link>
            <p className="mt-1 text-xs text-slate-500">Practice management</p>
          </div>
          <SidebarNav />
          <div className="border-t border-slate-200 p-3">
            {demoMode ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                Demo data
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Airtable live
              </span>
            )}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
          <CommandPanel />
        </div>
      </div>
    </div>
  );
}
