import { Link } from "wouter";
import { trpc } from "../lib/trpc";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/associate" className="btn btn-primary">
        Go to Associate
      </Link>
    </div>
  );
}

export function PublicNav() {
  return (
    <header className="border-b border-[var(--color-border)] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/associate" className="text-lg font-semibold text-[var(--color-primary)]">
          RMV Associate
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/associate/intake">Start intake</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

export function ServicesGrid() {
  const { data: services } = trpc.services.list.useQuery();

  const byCategory = (services ?? []).reduce<Record<string, typeof services>>((acc, s) => {
    const cat = s.category ?? "Other";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="card">
          <h3 className="mb-3 font-semibold">{cat}</h3>
          <ul className="space-y-2 text-sm">
            {(items ?? []).slice(0, 4).map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="font-medium">${Number(s.baseFee).toFixed(0)}+</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
