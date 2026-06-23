"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { btnPrimary, linkMatter } from "@/lib/ui-classes";
import { StatusBadge } from "./StatusBadge";
import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type MatterRef = { id: string; matterId: string; assignedAttorney: string };

const STATUS_OPTIONS = ["all", "To Do", "In Progress", "Blocked", "Done"] as const;
const PRIORITY_OPTIONS = ["all", "Urgent", "High", "Medium", "Low"] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];
type PriorityFilter = (typeof PRIORITY_OPTIONS)[number];

export function GlobalTaskList({
  initialTasks,
  matters,
  demoMode,
}: {
  initialTasks: Task[];
  matters: MatterRef[];
  demoMode: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [matterFilter, setMatterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [filingOnly, setFilingOnly] = useState(false);
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.assignedTo) set.add(t.assignedTo);
    }
    for (const m of matters) {
      if (m.assignedAttorney) set.add(m.assignedAttorney);
    }
    return ["all", ...Array.from(set).sort()];
  }, [tasks, matters]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (matterFilter !== "all" && t.matterId !== matterFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (filingOnly && !t.isFilingDeadline) return false;
      if (assignedFilter !== "all" && (t.assignedTo ?? "") !== assignedFilter) {
        return false;
      }
      if (dueFrom && (!t.dueDate || t.dueDate < dueFrom)) return false;
      if (dueTo && (!t.dueDate || t.dueDate > dueTo)) return false;
      if (search) {
        const lower = search.toLowerCase();
        if (
          !t.description.toLowerCase().includes(lower) &&
          !t.matterId.toLowerCase().includes(lower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    tasks,
    matterFilter,
    statusFilter,
    priorityFilter,
    assignedFilter,
    filingOnly,
    dueFrom,
    dueTo,
    search,
  ]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const da = a.dueDate ?? "9999";
      const db = b.dueDate ?? "9999";
      if (da !== db) return da < db ? -1 : 1;
      return a.matterId.localeCompare(b.matterId);
    });
    return copy;
  }, [filtered]);

  async function confirmComplete() {
    if (!completeTarget) return;
    const task = completeTarget;
    setIsCompleting(true);
    setCompleteError(null);
    const previousStatus = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "Done" } : t)),
    );
    try {
      const resp = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
      if (!resp.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)),
        );
        setCompleteError((await resp.text()) || `Failed to complete (${resp.status})`);
        return;
      }
      setCompleteTarget(null);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Field label="Search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Description or matter id…"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            />
          </Field>
          <Field label="Matter">
            <select
              value={matterFilter}
              onChange={(event) => setMatterFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="all">All matters</option>
              {matters.map((m) => (
                <option key={m.id} value={m.matterId}>
                  {m.matterId}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All statuses" : opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All priorities" : opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned to">
            <select
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {assignees.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "Anyone" : opt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due from">
            <input
              type="date"
              value={dueFrom}
              onChange={(event) => setDueFrom(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="Due to">
            <input
              type="date"
              value={dueTo}
              onChange={(event) => setDueTo(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="Filing deadlines">
            <label className="mt-1 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filingOnly}
                onChange={(event) => setFilingOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Show only filing deadlines
            </label>
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500">
            Showing {sorted.length} of {tasks.length} tasks.
          </p>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setComposer(true);
              setComposerError(null);
            }}
          >
            + Add task
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Matter</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Assigned</th>
              <th className="px-4 py-2">Filing</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No tasks match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr
                  key={t.id}
                  className={`border-t border-slate-100 hover:bg-slate-50 ${
                    t.isFilingDeadline ? "border-l-4 border-l-rose-500 font-semibold" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/matters/${t.matterId}`}
                      className={linkMatter}
                    >
                      {t.matterId}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{t.description}</td>
                  <td className="px-4 py-2 tabular-nums">{formatDate(t.dueDate)}</td>
                  <td className="px-4 py-2">{t.priority}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-2">{t.assignedTo ?? "—"}</td>
                  <td className="px-4 py-2">{t.isFilingDeadline ? "Yes" : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {t.status !== "Done" ? (
                      <button
                        type="button"
                        aria-label={`Complete task: ${t.description}`}
                        className={`text-xs ${linkMatter}`}
                        onClick={() => {
                          setCompleteTarget(t);
                          setCompleteError(null);
                        }}
                      >
                        Complete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {completeTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-complete-title"
        >
          <div className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 id="confirm-complete-title" className="text-lg font-semibold text-slate-900">
              Mark task complete?
            </h3>
            <p className="text-sm text-slate-700">
              <span className="font-medium">{completeTarget.matterId}</span> ·{" "}
              {completeTarget.description}
            </p>
            <p className="text-xs text-slate-500">
              This writes <code className="rounded bg-slate-100 px-1">status = Done</code> to
              Airtable. There is no undo.
            </p>
            {completeError ? (
              <p className="text-sm text-rose-700">{completeError}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setCompleteTarget(null);
                  setCompleteError(null);
                }}
                disabled={isCompleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                onClick={confirmComplete}
                disabled={isCompleting}
              >
                {isCompleting ? "Completing…" : "Complete task"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {composer ? (
        <TaskComposer
          matters={matters}
          demoMode={demoMode}
          error={composerError}
          isPending={isPending}
          onCancel={() => setComposer(false)}
          onSubmit={(form) => {
            if (demoMode) {
              setComposerError(
                "Sample data mode. Connect Airtable in Settings to create tasks.",
              );
              return;
            }
            startTransition(async () => {
              const resp = await fetch(`/api/matters/${form.matterCode}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  description: form.description,
                  dueDate: form.dueDate,
                  priority: form.priority,
                  isFilingDeadline: form.isFilingDeadline,
                }),
              });
              if (!resp.ok) {
                setComposerError((await resp.text()) || "Failed to create task.");
                return;
              }
              const data = (await resp.json()) as { task: Task };
              setTasks((prev) => [data.task, ...prev]);
              setComposer(false);
            });
          }}
        />
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TaskComposer({
  matters,
  demoMode,
  error,
  isPending,
  onCancel,
  onSubmit,
}: {
  matters: MatterRef[];
  demoMode: boolean;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (form: {
    matterCode: string;
    description: string;
    dueDate: string | null;
    priority: string;
    isFilingDeadline: boolean;
  }) => void;
}) {
  const [matterCode, setMatterCode] = useState(matters[0]?.matterId ?? "");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isFilingDeadline, setIsFilingDeadline] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-modal="true">
      <form
        className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!matterCode || !description.trim()) return;
          onSubmit({
            matterCode,
            description: description.trim(),
            dueDate: dueDate || null,
            priority,
            isFilingDeadline,
          });
        }}
      >
        <h3 className="text-lg font-semibold text-slate-900">Add task</h3>
        {demoMode ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Sample data mode. Task submission is disabled.
          </p>
        ) : null}
        <Field label="Matter">
          <select
            value={matterCode}
            onChange={(event) => setMatterCode(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            required
          >
            <option value="">— Select —</option>
            {matters.map((m) => (
              <option key={m.id} value={m.matterId}>
                {m.matterId}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option>Urgent</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isFilingDeadline}
            onChange={(event) => setIsFilingDeadline(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Filing deadline
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${btnPrimary} disabled:opacity-60`}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </div>
  );
}
