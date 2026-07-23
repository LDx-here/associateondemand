import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase } from "lucide-react";

import { getContact, listMatters, isDemoMode } from "@/lib/data-store";
import { EMPTY_CELL } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const demo = isDemoMode();
  const matters = await listMatters();
  const related = matters.filter(
    (m) =>
      contact.linkedMatterIds.includes(m.matterId) || contact.linkedMatterIds.includes(m.id),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All contacts
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {contact.role || "Contact"}
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {contact.displayName || "Untitled contact"}
        </h1>
        {demo ? (
          <p className="mt-1 text-xs text-slate-500">Demo mode — local seed contact.</p>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium">{contact.email || EMPTY_CELL}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="font-medium">{contact.phone || EMPTY_CELL}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Organization</dt>
            <dd>{contact.organization || EMPTY_CELL}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd>{contact.role || EMPTY_CELL}</dd>
          </div>
        </dl>
        {contact.notes ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{contact.notes}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Briefcase className="h-4 w-4" aria-hidden />
          Related matters
        </h2>
        {related.length === 0 ? (
          <p className="text-sm text-slate-500">
            Not linked to any matter yet. Open a matter Overview and use Add client contact or Link
            existing.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {related.map((m) => (
              <li key={m.id} className="py-2">
                <Link
                  href={`/matters/${m.matterId}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {m.matterId}
                </Link>
                <span className="ml-2 text-slate-600">
                  {m.title || m.clientName || m.caseType}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
