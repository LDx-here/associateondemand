"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Link2, UserPlus, Users } from "lucide-react";

import { AddContactButton, ContactFormModal } from "@/components/ContactFormModal";
import { EmptyState } from "@/components/EmptyState";
import type { Contact } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";
import { EMPTY_CELL } from "@/lib/utils";

export function MatterContactsPanel({
  matterId,
  initialContacts,
  allContacts = [],
  demoMode = false,
}: {
  matterId: string;
  initialContacts: Contact[];
  /** Available firm contacts for linking an existing row. */
  allContacts?: Contact[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasClient = contacts.some((c) => /client/i.test(c.role));
  const linkable = useMemo(() => {
    const linked = new Set(contacts.map((c) => c.id));
    return allContacts.filter((c) => !linked.has(c.id));
  }, [allContacts, contacts]);

  function upsert(contact: Contact) {
    setContacts((prev) => {
      const without = prev.filter((c) => c.id !== contact.id);
      return [...without, contact].sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || ""),
      );
    });
  }

  async function linkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", matterCode: matterId }),
      });
      const data = (await res.json()) as { contact?: Contact; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Link failed");
      upsert(data.contact!);
      setLinkOpen(false);
      setSelectedId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4" aria-hidden />
          Contacts
        </h3>
        <div className="flex flex-wrap gap-2">
          {!hasClient ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setCreateOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Add client contact
              </span>
            </button>
          ) : (
            <AddContactButton
              demoMode={demoMode}
              matterCode={matterId}
              label="Add contact"
              onCreated={upsert}
              className={btnSecondary}
            />
          )}
          {linkable.length > 0 ? (
            <button type="button" className={btnSecondary} onClick={() => setLinkOpen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Link existing
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {!hasClient ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No client contact linked yet. Add one so this matter has a primary client in firm contacts.
        </p>
      ) : null}

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts on this matter"
          description="Add a client or link co-counsel, opposing counsel, or other roles."
          className="py-6"
        />
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <div>
                <Link
                  href={`/contacts/${c.id}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {c.displayName || EMPTY_CELL}
                </Link>
                <span className="ml-2 text-slate-500">{c.role || "—"}</span>
                {c.email ? <p className="text-xs text-slate-500">{c.email}</p> : null}
              </div>
              {c.phone ? <span className="text-xs text-slate-500">{c.phone}</span> : null}
            </li>
          ))}
        </ul>
      )}

      <ContactFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={upsert}
        demoMode={demoMode}
        matterCode={matterId}
        defaultRole="Client"
        title="Add client contact"
      />

      {linkOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={linkExisting}
            className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">Link existing contact</h3>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Contact</span>
              <select
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select…</option>
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.role || "—"})
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setLinkOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={busy || !selectedId}>
                {busy ? "Linking…" : "Link to matter"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
