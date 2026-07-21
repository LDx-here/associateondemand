import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";

const NAV = [
  { label: "Pipeline", href: "/admin/matters" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Agents", href: "/admin/agents" },
  { label: "Firm Memory", href: "/admin/firm-memory" },
  { label: "Services", href: "/admin/services" },
  { label: "Drafting", href: "/admin/drafting" },
  { label: "Clio", href: "/admin/clio" },
];

export function DashboardLayout({ children, title }: { children: ReactNode; title: string }) {
  const [loc] = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar p-4">
        <Link href="/admin" className="mb-6 block text-lg font-semibold">
          RMV Legal OS
        </Link>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={loc.startsWith(item.href) ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/associate" className="mt-auto block pt-8 text-xs text-white/60">
          ← Public site
        </Link>
      </aside>
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
