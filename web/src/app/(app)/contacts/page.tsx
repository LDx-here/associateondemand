import Link from "next/link";
import { Users } from "lucide-react";

import { AddContactButton } from "@/components/ContactFormModal";
import { EmptyState } from "@/components/EmptyState";
import { listContacts, isDemoMode } from "@/lib/data-store";
import { EMPTY_CELL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listContacts();
  const demo = isDemoMode();
  const sorted = [...contacts].sort((a, b) =>
    (a.displayName || "").localeCompare(b.displayName || ""),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-600">
            Clients and matter-adjacent people — co-counsel, opposing counsel, judges, and more.
          </p>
          {demo ? (
            <p className="mt-1 text-xs text-slate-500">Demo mode — contacts saved to local seed.</p>
          ) : null}
        </div>
        <AddContactButton demoMode={demo} label="Add contact" defaultRole="Client" />
      </header>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add a client contact to start building your firm address book, then link people to matters."
            action={<AddContactButton demoMode={demo} label="Add first contact" defaultRole="Client" />}
          />
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Organization</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Matters</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {c.displayName || EMPTY_CELL}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.role || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.organization || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.email || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.phone || EMPTY_CELL}</td>
                  <td className="px-4 py-2">
                    {c.linkedMatterIds.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {c.linkedMatterIds.map((mid) => (
                          <Link
                            key={mid}
                            href={`/matters/${mid}`}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            {mid}
                          </Link>
                        ))}
                      </span>
                    ) : (
                      EMPTY_CELL
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
