import { listAllEvents, listAllTasks, listMatters, isDemoMode } from "@/lib/data-store";
import { CalendarBoard, type CalendarEntry } from "@/components/CalendarBoard";

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

  const [matters, rawEvents, allTasks] = await Promise.all([listMatters(), listAllEvents(), listAllTasks()]);
  const matterIndex = new Map(matters.map((m) => [m.id, m]));
  const events: CalendarEntry[] = rawEvents.map((e) => ({
    id: e.id,
    matterCode: matterIndex.get(e.matterId)?.matterId ?? e.matterId,
    matterRecordId: e.matterId || null,
    type: e.type,
    date: e.date,
    time: e.time,
    summary: e.description,
    description: e.longDescription,
    location: e.location,
    calendarSynced: e.calendarSynced,
  }));

  // Filing-deadline tasks (matter-lifecycle automation + manual) are a
  // separate data source from Events and never appeared here before,
  // despite the page's own subtitle promising filing deadlines.
  const filingDeadlineTasks: CalendarEntry[] = allTasks
    .filter((t) => t.isFilingDeadline && t.dueDate && t.status !== "Done")
    .map((t) => ({
      id: `task-${t.id}`,
      matterCode: t.matterId,
      matterRecordId: t.matterId || null,
      type: "Filing Deadline",
      date: t.dueDate as string,
      time: "",
      summary: t.description,
      description: "",
      location: "",
      calendarSynced: false,
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-600">
          Hearings, filing deadlines, and internal deadlines across all matters.
        </p>
      </header>

      <CalendarBoard
        events={[...events, ...filingDeadlineTasks]}
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
