"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

export type CalendarEntry = {
  id: string;
  matterCode: string;
  matterRecordId: string | null;
  type: string;
  date: string;
  time: string;
  summary: string;
  description: string;
  location: string;
  calendarSynced: boolean;
};

type MatterRef = { id: string; matterId: string };

const TYPE_COLORS: Record<string, string> = {
  Hearing: "bg-sky-100 text-sky-900 border-sky-300",
  "Filing Deadline": "bg-rose-100 text-rose-900 border-rose-300",
  "Internal Deadline": "bg-amber-100 text-amber-900 border-amber-300",
  "Court Date": "bg-violet-100 text-violet-900 border-violet-300",
  Reminder: "bg-slate-100 text-slate-800 border-slate-300",
};

function typeChipClass(type: string): string {
  return TYPE_COLORS[type] ?? "bg-slate-100 text-slate-800 border-slate-300";
}

export function CalendarBoard({
  events,
  matters,
  monthStartIso,
  demoMode,
}: {
  events: CalendarEntry[];
  matters: MatterRef[];
  monthStartIso: string;
  demoMode: boolean;
}) {
  const [filingOnly, setFilingOnly] = useState(false);
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const [composer, setComposer] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (filingOnly ? events.filter((e) => e.type === "Filing Deadline") : events),
    [events, filingOnly],
  );

  const monthStart = new Date(`${monthStartIso}T00:00:00`);
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const prev = navigateMonth(monthStart, -1);
  const next = navigateMonth(monthStart, 1);

  const cells = buildMonthCells(monthStart, filtered);
  const hasAnyEvents = events.length > 0;
  const hasVisibleEvents = filtered.length > 0;

  return (
    <>
      {!hasAnyEvents ? (
        <div
          role="status"
          className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
        >
          No events on the calendar yet. Use{" "}
          <span className="font-medium text-slate-800">+ Add event</span> to create the first
          one, or wait for an agent to schedule one against a matter.
        </div>
      ) : !hasVisibleEvents ? (
        <div
          role="status"
          className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
        >
          No events match the current filter.
        </div>
      ) : null}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?month=${formatMonth(prev)}`}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              ←
            </Link>
            <h2 className="text-lg font-semibold text-slate-900">{monthLabel}</h2>
            <Link
              href={`/calendar?month=${formatMonth(next)}`}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={filingOnly}
                onChange={(event) => setFilingOnly(event.target.checked)}
              />
              Filing deadlines only
            </label>
            <button
              type="button"
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              onClick={() => {
                setComposer(true);
                setComposerError(null);
              }}
            >
              + Add event
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="border-r border-slate-200 px-2 py-1 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => (
            <div
              key={cell.iso}
              className={`min-h-[110px] border-r border-b border-slate-200 px-2 py-1.5 text-xs last:border-r-0 ${
                cell.inMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className={cell.isToday ? "rounded-full bg-sky-600 px-2 py-0.5 font-medium text-white" : "font-medium"}>
                  {cell.day}
                </span>
              </div>
              <ul className="mt-1 space-y-1">
                {cell.events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={`block w-full rounded-md border px-2 py-1 text-left text-[11px] leading-tight hover:opacity-80 ${typeChipClass(event.type)}`}
                      onClick={() => setSelected(event)}
                      title={`${event.type}${event.time ? " at " + event.time : ""}: ${event.summary}`}
                    >
                      <span className="block truncate font-medium">{event.summary || event.type}</span>
                      <span className="block text-[10px] opacity-80">
                        {event.matterCode || ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <EventDrawer entry={selected} onClose={() => setSelected(null)} />
      ) : null}

      {composer ? (
        <EventComposer
          matters={matters}
          demoMode={demoMode}
          error={composerError}
          isPending={isPending}
          onCancel={() => setComposer(false)}
          onSubmit={(form) => {
            if (demoMode) {
              setComposerError(
                "Demo mode — creating events requires a live Airtable connection.",
              );
              return;
            }
            startTransition(async () => {
              const resp = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              if (!resp.ok) {
                setComposerError((await resp.text()) || "Failed to create event.");
                return;
              }
              setComposer(false);
              // Reload to pull the newly persisted row from Airtable.
              window.location.reload();
            });
          }}
        />
      ) : null}
    </>
  );
}

function EventDrawer({
  entry,
  onClose,
}: {
  entry: CalendarEntry;
  onClose: () => void;
}) {
  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col gap-3 border-l border-slate-200 bg-white p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{entry.type}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {entry.summary || entry.type}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <dl className="space-y-2 text-sm text-slate-700">
        <Row label="Date">
          {new Date(`${entry.date}T${entry.time || "00:00"}`).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: entry.time ? "numeric" : undefined,
            minute: entry.time ? "2-digit" : undefined,
          })}
        </Row>
        {entry.location ? <Row label="Location">{entry.location}</Row> : null}
        {entry.matterCode ? (
          <Row label="Matter">
            <Link
              href={`/matters/${entry.matterCode}`}
              className="text-sky-700 hover:underline"
            >
              {entry.matterCode}
            </Link>
          </Row>
        ) : null}
        {entry.calendarSynced ? (
          <Row label="Calendar synced">Yes</Row>
        ) : null}
        {entry.description ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Description</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{entry.description}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function EventComposer({
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
    summary: string;
    matterCode?: string;
    type: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
  }) => void;
}) {
  const [summary, setSummary] = useState("");
  const [matterCode, setMatterCode] = useState(matters[0]?.matterId ?? "");
  const [type, setType] = useState("Hearing");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        className="w-full max-w-lg space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!summary.trim()) return;
          onSubmit({
            summary: summary.trim(),
            matterCode: matterCode || undefined,
            type,
            date,
            time: time || undefined,
            location: location || undefined,
            description: description || undefined,
          });
        }}
      >
        <h3 className="text-lg font-semibold text-slate-900">Add event</h3>
        {demoMode ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Demo mode — the form is read-only until a live Airtable PAT is configured.
          </p>
        ) : null}

        <Field label="Summary">
          <input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
            placeholder="Master Calendar hearing — 9:00 AM"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Matter">
            <select
              value={matterCode}
              onChange={(event) => setMatterCode(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">— None —</option>
              {matters.map((m) => (
                <option key={m.id} value={m.matterId}>
                  {m.matterId}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option>Hearing</option>
              <option>Filing Deadline</option>
              <option>Internal Deadline</option>
              <option>Court Date</option>
              <option>Reminder</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              required
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </Field>
        </div>

        <Field label="Location">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            placeholder="Cincinnati Immigration Court, Courtroom 6"
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
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
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save event"}
          </button>
        </div>
      </form>
    </div>
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

type Cell = {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEntry[];
};

function buildMonthCells(monthStart: Date, events: CalendarEntry[]): Cell[] {
  const todayIso = isoDate(new Date());
  const firstDay = monthStart;
  const startWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekday);

  const byDate = new Map<string, CalendarEntry[]>();
  for (const event of events) {
    const key = (event.date || "").slice(0, 10);
    if (!key) continue;
    const arr = byDate.get(key) ?? [];
    arr.push(event);
    byDate.set(key, arr);
  }

  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = isoDate(d);
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === monthStart.getMonth(),
      isToday: iso === todayIso,
      events: byDate.get(iso) ?? [],
    });
  }
  return cells;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function navigateMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
