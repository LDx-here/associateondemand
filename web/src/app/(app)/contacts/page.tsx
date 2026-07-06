import { Users } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { listContacts, isDemoMode } from "@/lib/data-store";
import { EMPTY_CELL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listContacts();
  const demo = isDemoMode();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
        <p className="text-sm text-slate-600">
          Opposing counsel, experts, interpreters, and other matter-adjacent contacts from Airtable.
        </p>
        {demo ? (
          <p className="mt-1 text-xs text-slate-500">Connect Airtable to load live contacts.</p>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Organization</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-2">
                  <EmptyState
                    icon={Users}
                    title="No contacts yet."
                    description="Add rows to the Contacts table in Airtable to see them here."
                  />
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{c.displayName || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.role || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.organization || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.email || EMPTY_CELL}</td>
                  <td className="px-4 py-2">{c.phone || EMPTY_CELL}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
