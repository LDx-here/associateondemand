import Link from "next/link";

import { CommandPanel } from "@/components/CommandPanel";
import { InboxBadge } from "@/components/InboxBadge";
import { SessionAccount } from "@/components/SessionAccount";
import { TopNav } from "@/components/TopNav";
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

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <Link
              className="shrink-0 font-semibold tracking-tight text-slate-900"
              href="/dashboard"
            >
              <span className="hidden sm:inline">Recover My Value</span>
              <span className="sm:hidden">RMV</span>
            </Link>
            <p className="hidden text-xs text-slate-500 xl:block">Overflow counsel · capacity relief</p>

            <div className="hidden min-w-0 flex-1 justify-center lg:flex">
              <TopNav />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <InboxBadge />
              <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex">
                {demoMode ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                    Sample
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    Live
                  </span>
                )}
                <SessionAccount compact variant="header" />
              </div>
              <div className="lg:hidden">
                <TopNav />
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
