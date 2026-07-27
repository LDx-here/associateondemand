"use client";

import { ListTodo, Pencil } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { TaskCompleteModal } from "@/components/TaskCompleteModal";
import { useToast } from "@/components/Toast";
import type { Task } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

function TaskEditRow({
  task,
  onSaved,
  onCancel,
}: {
  task: Task;
  onSaved: (updated: Task) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const resp = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: dueDate || null, priority }),
      });
      const data = (await resp.json()) as { task?: Task; error?: string };
      if (!resp.ok || !data.task) throw new Error(data.error ?? "Could not update task.");
      showToast("Task updated.", "success");
      onSaved(data.task);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update task.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-2">
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
        disabled={saving}
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
        disabled={saving}
      >
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <button
        type="button"
        disabled={saving}
        className="rounded-md bg-sky-800 px-2 py-1 text-xs font-medium text-white hover:bg-sky-900 disabled:opacity-40"
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className={`${btnSecondary} text-xs`} disabled={saving} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export function TaskList({
  matterId,
  initialTasks,
  onUpdated,
}: {
  matterId: string;
  initialTasks: Task[];
  onUpdated?: () => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!tasks.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={ListTodo}
          title="No tasks yet."
          description="Create the first task for this matter using the form."
        />
      </div>
    );
  }

  function applyUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingId(null);
    onUpdated?.();
  }

  return (
    <>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
        {tasks.map((t) => {
          const missingDeadlineDate = t.isFilingDeadline && !t.dueDate && t.status !== "Done";
          return (
            <li
              key={t.id}
              className={cn(
                "p-3 text-sm",
                t.isFilingDeadline ? "border-l-4 border-l-rose-500 font-semibold" : "",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{t.description}</p>
                  <p className="text-xs font-normal text-slate-500 tabular-nums">
                    Due {formatDate(t.dueDate)} · {t.priority}
                    {t.isFilingDeadline ? " · filing deadline" : ""}
                  </p>
                  {missingDeadlineDate ? (
                    <p className="mt-0.5 text-xs font-normal text-rose-700">
                      No date set — won&apos;t appear on Upcoming Deadlines or the calendar until one is added.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={t.status} />
                  {t.status !== "Done" ? (
                    <button
                      type="button"
                      aria-label={`Edit task: ${t.description}`}
                      className={cn(btnSecondary, "inline-flex items-center gap-1")}
                      onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                    >
                      <Pencil className="h-3 w-3" aria-hidden />
                      {missingDeadlineDate ? "Add due date" : "Edit"}
                    </button>
                  ) : null}
                  {t.status !== "Done" ? (
                    <button
                      type="button"
                      aria-label={`Complete task: ${t.description}`}
                      className={btnSecondary}
                      onClick={() => setCompleteTarget(t)}
                    >
                      Complete
                    </button>
                  ) : null}
                </div>
              </div>
              {editingId === t.id ? (
                <TaskEditRow task={t} onSaved={applyUpdate} onCancel={() => setEditingId(null)} />
              ) : null}
            </li>
          );
        })}
      </ul>

      {completeTarget ? (
        <TaskCompleteModal
          task={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onComplete={() => {
            setTasks((prev) =>
              prev.map((t) => (t.id === completeTarget.id ? { ...t, status: "Done" } : t)),
            );
            onUpdated?.();
          }}
        />
      ) : null}
    </>
  );
}
