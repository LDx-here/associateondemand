"use client";

import { Inbox as InboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { InboxItem } from "@/lib/airtable/queries";
import { btnPrimary, linkMatter } from "@/lib/ui-classes";

type ResolveTarget = {
  item: InboxItem;
  option: string;
};

export function InboxBoard({
  pending: initialPending,
  resolved: initialResolved,
  demoMode,
}: {
  pending: InboxItem[];
  resolved: InboxItem[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [resolved, setResolved] = useState(initialResolved);
  const [target, setTarget] = useState<ResolveTarget | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(item: InboxItem, option: string) {
    setTarget({ item, option });
    setNote(option);
    setError(null);
  }

  function close() {
    setTarget(null);
    setNote("");
    setError(null);
  }

  async function submit() {
    if (!target) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Resolution note required.");
      return;
    }
    setError(null);
    const status = target.option.toLowerCase().startsWith("dismiss")
      ? "Dismissed"
      : "Resolved";

    if (demoMode) {
      const now = new Date().toISOString();
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [
        { ...target.item, status, resolution: trimmed, resolvedAt: now },
        ...prev,
      ]);
      close();
      return;
    }

    startTransition(async () => {
      const resp = await fetch(`/api/inbox/${target.item.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: trimmed, status }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setError(text || `Resolve failed (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as { item: InboxItem };
      setPending((prev) => prev.filter((p) => p.id !== target.item.id));
      setResolved((prev) => [data.item, ...prev]);
      close();
      router.refresh();
    });
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pending ({pending.length})
          </h2>
        </div>
        {pending.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500"
          >
            <InboxIcon className="h-6 w-6 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-700">Inbox clear.</span>
            <span>Nothing waiting on attorney review.</span>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((item) => (
              <InboxCard
                key={item.id}
                item={item}
                onAction={(option) => open(item, option)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recently resolved
        </h2>
        {resolved.length > 0 ? (
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
            {resolved.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.title || item.agent}</span>
                  <StatusBadge status={item.status} />
                </div>
                {item.resolution ? (
                  <p className="mt-1 text-slate-700">{item.resolution}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {item.resolvedAt
                    ? new Date(item.resolvedAt).toLocaleString()
                    : ""}
                  {item.matterId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/matters/${item.matterId}`}
                        className={linkMatter}
                      >
                        {item.matterId}
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={InboxIcon}
              title="No resolved items yet."
              description="Resolved PM inbox items will appear here after you review pending items."
            />
          </div>
        )}
      </section>

      {target ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {target.option}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{target.item.title || target.item.agent}</p>
            <label className="mt-4 block text-sm">
              <span className="font-medium text-slate-700">Resolution note</span>
              <textarea
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What did you do? What should the agent do next?"
              />
            </label>
            {error ? (
              <p className="mt-2 text-sm text-rose-700">{error}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={close}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnPrimary} disabled:opacity-60`}
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save resolution"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InboxCard({
  item,
  onAction,
}: {
  item: InboxItem;
  onAction: (option: string) => void;
}) {
  const options = item.options.length > 0 ? item.options : ["Approve", "Reject", "Modify", "Defer"];
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {item.title || item.agent}
        </h3>
        <StatusBadge status={item.status} />
      </header>
      <p className="text-xs text-slate-500">
        {item.agent}
        {item.matterId ? (
          <>
            {" · "}
            <Link
              href={`/matters/${item.matterId}`}
              className={linkMatter}
            >
              {item.matterId}
            </Link>
          </>
        ) : null}
        {item.createdAt ? (
          <>
            {" · "}
            {new Date(item.createdAt).toLocaleString()}
          </>
        ) : null}
      </p>
      {item.whatTried ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What I tried
          </h4>
          <p className="mt-0.5 text-sm text-slate-700">{item.whatTried}</p>
        </section>
      ) : null}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
          What I need from you
        </h4>
        <p className="mt-0.5 text-sm font-medium text-slate-900">
          {item.whatNeeded || "Attorney review required."}
        </p>
      </section>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-slate-500 hover:bg-slate-50"
            onClick={() => onAction(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </article>
  );
}
