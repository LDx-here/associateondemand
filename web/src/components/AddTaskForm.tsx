"use client";

import { useState } from "react";

import { btnPrimary } from "@/lib/ui-classes";

export function AddTaskForm({ matterId, onCreated }: { matterId: string; onCreated?: () => void }) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isFilingDeadline, setIsFilingDeadline] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/matters/${matterId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, dueDate: dueDate || null, priority, isFilingDeadline }),
    });
    setDescription("");
    setDueDate("");
    onCreated?.();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium">Add task</p>
      <input
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        type="date"
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <select
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={isFilingDeadline} onChange={(e) => setIsFilingDeadline(e.target.checked)} />
        Statutory / court filing deadline
      </label>
      <button type="submit" className={btnPrimary}>
        Save task
      </button>
    </form>
  );
}
