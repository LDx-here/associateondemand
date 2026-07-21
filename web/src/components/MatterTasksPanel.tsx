"use client";

import { ListTodo, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AddTaskForm } from "@/components/AddTaskForm";
import { TaskList } from "@/components/TaskList";
import { useToast } from "@/components/Toast";
import { deliverableLabel, matterTaskTemplates } from "@/lib/matter-task-templates";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";
import type { Task } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";

export function MatterTasksPanel({
  matterId,
  caseType,
  initialTasks,
  onUpdated,
}: {
  matterId: string;
  caseType: string;
  initialTasks: Task[];
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [deliverableId, setDeliverableId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  useEffect(() => {
    void fetch(`/api/matters/${matterId}/drafting-facts`)
      .then((r) => r.json())
      .then((data: { facts?: DraftingFactsPayload | null }) => {
        setDeliverableId(data.facts?.deliverableId);
      })
      .catch(() => setDeliverableId(undefined));
  }, [matterId]);

  const templates = useMemo(
    () => matterTaskTemplates(caseType, deliverableId),
    [caseType, deliverableId],
  );

  const existingDescriptions = useMemo(
    () => new Set(tasks.map((t) => t.description.toLowerCase())),
    [tasks],
  );

  async function createFromTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template || existingDescriptions.has(template.description.toLowerCase())) return;
    setCreating(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: template.description,
          priority: template.priority,
          isFilingDeadline: template.isFilingDeadline ?? false,
        }),
      });
      if (!resp.ok) throw new Error("Could not create task");
      showToast("Task added from template.", "success");
      onUpdated();
    } catch {
      showToast("Could not create task.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {templates.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-sky-800" aria-hidden />
                Suggested tasks
              </h3>
              <p className="text-xs text-slate-600">
                {caseType}
                {deliverableId ? ` · ${deliverableLabel(deliverableId)}` : ""} checklist — click to add
              </p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2">
            {templates.map((t) => {
              const exists = existingDescriptions.has(t.description.toLowerCase());
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={exists || creating}
                    className={`${btnSecondary} text-xs disabled:opacity-40`}
                    onClick={() => void createFromTemplate(t.id)}
                  >
                    <ListTodo className="mr-1 inline h-3 w-3" aria-hidden />
                    {exists ? "Added" : t.description.slice(0, 48)}
                    {t.description.length > 48 ? "…" : ""}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AddTaskForm matterId={matterId} onCreated={onUpdated} />
        <TaskList matterId={matterId} initialTasks={tasks} onUpdated={onUpdated} />
      </div>
    </div>
  );
}
