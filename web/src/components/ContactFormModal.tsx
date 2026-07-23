"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CONTACT_ROLES, type Contact } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const inputClass = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export type ContactFormValues = {
  displayName: string;
  role: string;
  email: string;
  phone: string;
  organization: string;
  notes: string;
};

const emptyForm = (defaults?: Partial<ContactFormValues>): ContactFormValues => ({
  displayName: defaults?.displayName ?? "",
  role: defaults?.role ?? "Client",
  email: defaults?.email ?? "",
  phone: defaults?.phone ?? "",
  organization: defaults?.organization ?? "",
  notes: defaults?.notes ?? "",
});

export function ContactFormModal({
  open,
  onClose,
  onCreated,
  demoMode,
  matterCode,
  defaultRole = "Client",
  title = "Add contact",
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (contact: Contact) => void;
  demoMode?: boolean;
  /** When set, the new contact is linked to this matter. */
  matterCode?: string;
  defaultRole?: string;
  title?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => emptyForm({ role: defaultRole }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          matterCode: matterCode || undefined,
        }),
      });
      const data = (await res.json()) as { contact?: Contact; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      onCreated?.(data.contact!);
      setForm(emptyForm({ role: defaultRole }));
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {demoMode ? (
          <p className="text-sm text-amber-700">Demo mode — contact saved to local seed only.</p>
        ) : null}
        {matterCode ? (
          <p className="text-xs text-slate-500">
            Will be linked to matter <span className="font-medium text-slate-700">{matterCode}</span>.
          </p>
        ) : null}

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Name</span>
          <input
            required
            className={inputClass}
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Full name"
            autoFocus
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Role</span>
          <select
            className={inputClass}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {CONTACT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Phone</span>
            <input
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Organization (optional)</span>
          <input
            className={inputClass}
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Notes (optional)</span>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save contact"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddContactButton({
  demoMode,
  matterCode,
  defaultRole,
  label = "Add contact",
  title,
  onCreated,
  className,
}: {
  demoMode?: boolean;
  matterCode?: string;
  defaultRole?: string;
  label?: string;
  title?: string;
  onCreated?: (contact: Contact) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        }
      >
        {label}
      </button>
      <ContactFormModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
        demoMode={demoMode}
        matterCode={matterCode}
        defaultRole={defaultRole}
        title={title ?? label}
      />
    </>
  );
}
