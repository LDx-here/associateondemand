"use client";

import {
  Briefcase,
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
  Menu,
  Settings,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

/** Primary overflow-counsel workflow — Master Roadmap Phase 1. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assignments/new", label: "New assignment", icon: FilePlus2 },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/matters", label: "Matters", icon: Briefcase },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Secondary / admin tools — collapsed under More on desktop, mobile menu. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/help", label: "How this works", icon: HelpCircle },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/book", label: "Book consultation", icon: Calendar },
  { href: "/intake/upload", label: "Intake upload", icon: Upload },
  { href: "/knowledge-map", label: "Knowledge map", icon: Map },
  { href: "/import/eimmigration", label: "Import", icon: FileUp },
];

function isActive(pathname: string, href: Route): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
  compact = false,
}: NavItem & { pathname: string; onNavigate?: () => void; compact?: boolean }) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md text-sm transition",
        compact ? "px-3 py-2.5" : "px-2.5 py-1.5",
        active
          ? "bg-slate-100 font-medium text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <Icon className={cn("shrink-0", compact ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
      {label}
    </Link>
  );
}

function MoreMenu({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const secondaryActive = SECONDARY_NAV.some(({ href }) => isActive(pathname, href));

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition",
          secondaryActive || open
            ? "bg-slate-100 font-medium text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        More
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm transition hover:bg-slate-50",
                isActive(pathname, item.href) ? "font-medium text-slate-900" : "text-slate-600",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
        <MoreMenu pathname={pathname} />
      </nav>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden"
            aria-hidden
            onClick={closeMobile}
          />
          <div
            id="mobile-nav"
            className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Main</p>
            <div className="space-y-0.5">
              {PRIMARY_NAV.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} onNavigate={closeMobile} compact />
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">More tools</p>
            <div className="space-y-0.5">
              {SECONDARY_NAV.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} onNavigate={closeMobile} compact />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
