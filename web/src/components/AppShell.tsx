import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  FileUp,
  Inbox,
  LayoutDashboard,
  Map,
  Settings,
  Upload,
} from "lucide-react";

import { CommandPanel } from "@/components/CommandPanel";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matters", label: "Matters", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "PM Inbox", icon: Inbox },
  { href: "/intake/upload", label: "Intake", icon: Upload },
  { href: "/knowledge-map", label: "Knowledge map", icon: Map },
  { href: "/import/eimmigration", label: "Import", icon: FileUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

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
          <nav className="flex-1 space-y-0.5 p-3">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-sky-700",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-3">
            {demoMode ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                Demo data
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
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
