import Link from "next/link";

import { CommandPanel } from "@/components/CommandPanel";
import { InboxBadge } from "@/components/InboxBadge";
import { SessionAccount } from "@/components/SessionAccount";
import { SidebarNav } from "@/components/SidebarNav";
import { ToastProvider } from "@/components/Toast";

export async function AppShell({
  children,
  demoMode,
}: {
  children: React.ReactNode;
  demoMode: boolean;
}) {
  return (
    <ToastProvider>
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
          <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-200">
            <div className="border-b border-slate-800 px-4 py-5">
              <Link className="block font-semibold tracking-tight text-white" href="/dashboard">
                Recover My Value
              </Link>
              <p className="mt-1 text-xs text-slate-400">Practice management</p>
              <div className="mt-2">
                <InboxBadge />
              </div>
            </div>
            <SidebarNav />
            <div className="mt-auto space-y-3 border-t border-slate-800 p-3">
              {demoMode ? (
                <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                  Sample data
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  Live data
                </span>
              )}
              <SessionAccount compact />
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
            <CommandPanel />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
