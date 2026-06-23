"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import type { Task } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

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

  async function complete(taskId: string) {
    await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "Done" } : t)));
    onUpdated?.();
  }

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

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
      {tasks.map((t) => (
        <li
          key={t.id}
          className={cn(
            "flex items-start justify-between gap-3 p-3 text-sm",
            t.isFilingDeadline ? "border-l-4 border-l-rose-500 font-semibold" : "",
          )}
        >
          <div>
            <p className="font-medium text-slate-900">{t.description}</p>
            <p className="text-xs font-normal text-slate-500 tabular-nums">
              Due {formatDate(t.dueDate)} · {t.priority}
              {t.isFilingDeadline ? " · filing deadline" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            {t.status !== "Done" ? (
              <button
                type="button"
                aria-label={`Complete task: ${t.description}`}
                className={btnSecondary}
                onClick={() => complete(t.id)}
              >
                Complete
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
