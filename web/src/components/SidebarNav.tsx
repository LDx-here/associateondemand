"use client";

import {
  Briefcase,
  Calendar,
  CheckSquare,
  FileUp,
  Inbox,
  LayoutDashboard,
  Map,
  Settings,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SidebarNavItem = {
  /** Statically-known internal route; Next.js typed routes require this. */
  href: Route;
  label: string;
  icon: LucideIcon;
};

/**
 * Navigation items live alongside the client component so the icon
 * function references never cross the RSC serialization boundary
 * (functions aren't serializable from Server → Client Components).
 */
const NAV_ITEMS: SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matters", label: "Matters", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "PM Inbox", icon: Inbox },
  { href: "/intake/upload", label: "Intake", icon: Upload },
  { href: "/knowledge-map", label: "Knowledge map", icon: Map },
  { href: "/import/eimmigration", label: "Import", icon: FileUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-sky-50 font-medium text-sky-700 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-sky-600"
                : "text-slate-700 hover:bg-slate-100 hover:text-sky-700",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active ? "text-sky-600" : "text-slate-400")}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
