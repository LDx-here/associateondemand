"use client";

import { useState } from "react";

import type { Task } from "@/lib/types";
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

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 p-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">{t.description}</p>
            <p className="text-xs text-slate-500">
              Due {t.dueDate ?? "—"} · {t.priority}
              {t.isFilingDeadline ? " · filing deadline" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            {t.status !== "Done" ? (
              <button type="button" className="text-xs text-sky-700 underline" onClick={() => complete(t.id)}>
                Complete
              </button>
            ) : null}
          </div>
        </li>
      ))}
      {!tasks.length ? <li className="p-4 text-sm text-slate-500">No tasks yet.</li> : null}
    </ul>
  );
}
