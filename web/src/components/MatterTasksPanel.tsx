"use client";

import { ListTodo, Sparkles, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AddTaskForm } from "@/components/AddTaskForm";
import { TaskList } from "@/components/TaskList";
import { useToast } from "@/components/Toast";
import {
  LIFECYCLE_TRANSITIONS,
  normalizeLifecycleStage,
  type MatterLifecycleStage,
} from "@/lib/matter-lifecycle-stage";
import { deliverableLabel, matterTaskTemplates } from "@/lib/matter-task-templates";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";
import type { Task } from "@/lib/types";
import { btnSecondary } from "@/lib/ui-classes";

/** Mirrors DECISION_OUTCOMES in api/matters/[matterId]/decision/route.ts. */
const DECISION_OUTCOMES = ["Approved", "Denied", "RFE issued", "NOID issued", "Continued", "Other"] as const;

function DecisionForm({ matterId, onRecorded }: { matterId: string; onRecorded: () => void }) {
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState<string>(DECISION_OUTCOMES[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note: note.trim() || undefined }),
      });
      const data = (await resp.json()) as { error?: string; tasksCreated?: number };
      if (!resp.ok) throw new Error(data.error ?? "Could not record decision.");
      showToast(
        data.tasksCreated
          ? `Decision recorded — moved to Resolution, ${data.tasksCreated} task${data.tasksCreated === 1 ? "" : "s"} added.`
          : "Decision recorded — moved to Resolution.",
        "success",
      );
      setNote("");
      onRecorded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not record decision.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-sky-200 bg-sky-50/60 p-2">
      <label className="flex flex-col gap-1 text-xs text-slate-700">
        Decision
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          disabled={submitting}
        >
          {DECISION_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-slate-700">
        Note (optional)
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. approval notice date, next filing needed"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          disabled={submitting}
        />
      </label>
      <button
        type="button"
        disabled={submitting}
        className="rounded-md bg-sky-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-900 disabled:opacity-40"
        onClick={() => void submit()}
      >
        {submitting ? "Recording…" : "Record decision"}
      </button>
    </div>
  );
}

function LifecycleStagePanel({
  matterId,
  stage,
  sheetsEnabled,
  onMoved,
}: {
  matterId: string;
  stage: MatterLifecycleStage;
  sheetsEnabled: boolean;
  onMoved: () => void;
}) {
  const { showToast } = useToast();
  const [moving, setMoving] = useState(false);
  const awaitingDecision = stage === "Filed/Awaiting Decision";
  // Resolution is reached via the decision form below, not a bare stage move, when awaiting a decision.
  const nextStages = (LIFECYCLE_TRANSITIONS[stage] ?? []).filter(
    (s) => !(awaitingDecision && s === "Resolution"),
  );

  async function moveTo(next: MatterLifecycleStage) {
    setMoving(true);
    try {
      const resp = await fetch(`/api/matters/${matterId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      const data = (await resp.json()) as { error?: string; tasksCreated?: number };
      if (!resp.ok) throw new Error(data.error ?? "Could not update lifecycle stage.");
      showToast(
        data.tasksCreated
          ? `Moved to ${next} — ${data.tasksCreated} task${data.tasksCreated === 1 ? "" : "s"} added.`
          : `Moved to ${next}.`,
        "success",
      );
      onMoved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update lifecycle stage.", "error");
    } finally {
      setMoving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Workflow className="h-4 w-4 text-sky-800" aria-hidden />
        Matter lifecycle
      </h3>
      {sheetsEnabled ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
            {stage}
          </span>
          {nextStages.length > 0 ? (
            <>
              <span className="text-xs text-slate-500">Move to:</span>
              {nextStages.map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={moving}
                  className={`${btnSecondary} text-xs disabled:opacity-40`}
                  onClick={() => void moveTo(next)}
                >
                  {next}
                </button>
              ))}
            </>
          ) : null}
          {awaitingDecision ? <DecisionForm matterId={matterId} onRecorded={onMoved} /> : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Lifecycle stage tracking (and the task checklist that comes with each stage) requires
          Google Sheets — connect it in Settings to use this feature.
        </p>
      )}
    </section>
  );
}

export function MatterTasksPanel({
  matterId,
  caseType,
  lifecycleStage,
  sheetsEnabled = false,
  initialTasks,
  onUpdated,
}: {
  matterId: string;
  caseType: string;
  lifecycleStage?: string;
  sheetsEnabled?: boolean;
  initialTasks: Task[];
  onUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [deliverableId, setDeliverableId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

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
      <LifecycleStagePanel
        matterId={matterId}
        stage={normalizeLifecycleStage(lifecycleStage)}
        sheetsEnabled={sheetsEnabled}
        onMoved={onUpdated}
      />

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
