"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import type { CalendarEvent } from "@/lib/types";
import { btnPrimary } from "@/lib/ui-classes";
import { EMPTY_CELL, formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";

type MatterEvent = CalendarEvent & { location?: string; time?: string };

export function MatterEventsPanel({
  matterId,
  initialEvents,
  demoMode,
}: {
  matterId: string;
  initialEvents: MatterEvent[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [summary, setSummary] = useState("");
  const [type, setType] = useState("Internal Deadline");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (demoMode) {
      setError("Sample data mode. Connect Airtable in Settings to save events.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          matterCode: matterId,
          type,
          date,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error ?? `Failed (${resp.status})`);
        return;
      }
      setEvents((prev) => [data.event as MatterEvent, ...prev]);
      setSummary("");
      setDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"
        onSubmit={addEvent}
      >
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">Summary</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={summary}
            onChange={(ev) => setSummary(ev.target.value)}
            placeholder="Master calendar hearing prep"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Type</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={type}
            onChange={(ev) => setType(ev.target.value)}
          >
            <option>Hearing</option>
            <option>Filing Deadline</option>
            <option>Internal Deadline</option>
            <option>Court Date</option>
            <option>Reminder</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Date</span>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
            required
          />
        </label>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" disabled={busy} className={`${btnPrimary} disabled:opacity-50`}>
            {busy ? "Saving…" : "Add event"}
          </button>
        </div>
        {error ? <p className="text-sm text-rose-700 sm:col-span-2">{error}</p> : null}
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <EmptyState
                    icon={Calendar}
                    title="No events yet."
                    description="Add a hearing or deadline above, or use the firm calendar page."
                  />
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{ev.type}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(ev.date)}</td>
                  <td className="px-3 py-2">{ev.description}</td>
                  <td className="px-3 py-2">{ev.location || EMPTY_CELL}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Events sync to the firm calendar.{" "}
        <a className="font-medium text-slate-800 underline-offset-2 hover:underline" href="/calendar">
          Open calendar
        </a>
      </p>
    </div>
  );
}
