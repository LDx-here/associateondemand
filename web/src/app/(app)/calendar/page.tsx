import {
  listEventsFromAirtable,
  listMattersFromAirtable,
} from "@/lib/airtable/queries";
import { isDemoMode } from "@/lib/data-store";
import { getMutableSeed } from "@/lib/demo-store-mutable";
import { CalendarBoard, type CalendarEntry } from "@/components/CalendarBoard";
import type { Matter } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const demo = isDemoMode();

  const now = new Date();
  const monthStart = sp.month
    ? parseMonthParam(sp.month, now)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  let events: CalendarEntry[] = [];
  let matters: Matter[] = [];

  if (demo) {
    const seed = await getMutableSeed();
    matters = seed.matters;
    events = seed.events.map((e) => ({
      id: e.id,
      matterCode: e.matterId,
      matterRecordId: null,
      type: e.type,
      date: e.date,
      time: "",
      summary: e.description,
      description: e.description,
      location: "",
      calendarSynced: false,
    }));
  } else {
    const [airtableEvents, airtableMatters] = await Promise.all([
      listEventsFromAirtable(),
      listMattersFromAirtable(),
    ]);
    const matterIndex = new Map(airtableMatters.map((m) => [m.id, m]));
    matters = airtableMatters;
    events = airtableEvents.map((e) => ({
      id: e.id,
      matterCode: matterIndex.get(e.matterId)?.matterId ?? "",
      matterRecordId: e.matterId || null,
      type: e.type,
      date: e.date,
      time: e.time,
      summary: e.description,
      description: e.longDescription,
      location: e.location,
      calendarSynced: e.calendarSynced,
    }));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-600">
          Hearings, filing deadlines, and internal deadlines across all matters.
        </p>
      </header>

      <CalendarBoard
        events={events}
        matters={matters.map((m) => ({ id: m.id, matterId: m.matterId }))}
        monthStartIso={isoDate(monthStart)}
        demoMode={demo}
      />
    </div>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseMonthParam(value: string, fallback: Date): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }
  return new Date(year, month, 1);
}
