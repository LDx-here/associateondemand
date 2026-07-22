"use client";

import {
  Briefcase,
  Brain,
  Calendar,
  CheckSquare,
  ChevronDown,
  FilePlus2,
  FileUp,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Map,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type SidebarNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

const PRIMARY_NAV: SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assignments/new", label: "New assignment", icon: FilePlus2 },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/matters", label: "Matters", icon: Briefcase },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
];

const SECONDARY_NAV: SidebarNavItem[] = [
  { href: "/help", label: "How this works", icon: HelpCircle },
  { href: "/firm-memory", label: "Firm Memory", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/book", label: "Book consultation", icon: Calendar },
  { href: "/intake/upload", label: "Intake upload", icon: Upload },
  { href: "/knowledge-map", label: "Knowledge map", icon: Map },
  { href: "/import/eimmigration", label: "Import", icon: FileUp },
];

function NavLink({ href, label, icon: Icon }: SidebarNavItem) {
  const pathname = usePathname() ?? "/";
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
        active
          ? "bg-slate-800 font-medium text-white before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-slate-400"
          : "text-slate-300 hover:bg-slate-800 hover:text-white",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", active ? "text-slate-200" : "text-slate-500")}
        aria-hidden
      />
      {label}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname() ?? "/";
  const secondaryActive = SECONDARY_NAV.some(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
  const [moreOpen, setMoreOpen] = useState(secondaryActive);

  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {PRIMARY_NAV.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <div className="pt-3">
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 transition hover:bg-slate-800 hover:text-slate-300",
            secondaryActive && "text-slate-300",
          )}
          aria-expanded={moreOpen}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition", moreOpen ? "rotate-0" : "-rotate-90")}
            aria-hidden
          />
          More tools
        </button>
        {moreOpen ? (
          <div className="mt-1 space-y-0.5 border-l border-slate-800 pl-2">
            {SECONDARY_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
