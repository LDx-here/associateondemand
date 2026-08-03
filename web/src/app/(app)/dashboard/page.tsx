import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Inbox,
  Sparkles,
} from "lucide-react";

import { GettingStartedBanner, OnboardingWizard } from "@/components/OnboardingWizard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ResumeIntakeBanner } from "@/components/ResumeIntakeBanner";
import { EmptyState } from "@/components/EmptyState";
import { DashboardCharts } from "@/components/DashboardCharts";
import { KpiCard } from "@/components/KpiCard";
import {
  filingDeadlinesMissingDate,
  filingDeadlinesWithin,
  firmMemoryCompleteness,
  greeting,
  inboxToActivityEntries,
  matterLifecycleBreakdown,
  overflowDashboardMetrics,
  overflowWelcomeSubtitle,
  recentActivity,
  upcomingDeadlines,
} from "@/lib/dashboard-aggregates";
import { notesMissingTime, rollUpWorkSince, toBillableHours } from "@/lib/work-entry";
import { mattersNeedingAttention, practicePulse } from "@/lib/practice-pulse";
import {
  countUnreadInbox,
  getFirmMemoryStatus,
  listAllNotes,
  listAllTasks,
  listInboxItems,
  listMatters,
  isSampleDataMode,
  isQuotaFallbackMode,
} from "@/lib/data-store";
import { dataStoreLabel, usesGoogleSheets } from "@/lib/data-store-config";
import { getMutableSeed } from "@/lib/demo-store-mutable";
import { getSupabaseSessionUser } from "@/lib/supabase/server";
import { partnerSubmissionUrl } from "@/lib/partner-submission";
import { btnPrimary, linkMatter } from "@/lib/ui-classes";
import { formatDate } from "@/lib/utils";

function daysUntil(value: string | null | undefined, now = new Date()): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default async function DashboardPage() {
  const now = new Date();
  const matters = await listMatters();
  const tasks = await listAllTasks();
  const matterIndex = new Map(matters.map((m) => [m.matterId, m]));
  const demo = isSampleDataMode();
  const quotaFallback = isQuotaFallbackMode();
  const seed = demo ? await getMutableSeed() : null;

  const session = await getSupabaseSessionUser();
  const displayName =
    session?.name?.split(" ")[0] ??
    session?.email?.split("@")[0] ??
    "Counsel";

  let inboxItems: Awaited<ReturnType<typeof listInboxItems>> = [];
  try {
    inboxItems = await listInboxItems();
  } catch {
    inboxItems = seed?.inboxItems ?? [];
  }

  const overflow = overflowDashboardMetrics(inboxItems, now);
  let firmMemory = { templateCount: 0, sampleCount: 0, stylePreferenceCount: 0, configured: false };
  try {
    firmMemory = await getFirmMemoryStatus();
  } catch {
    /* demo or offline */
  }
  const firmMemoryPct = firmMemoryCompleteness(firmMemory);

  const filingDeadlines14 = filingDeadlinesWithin(tasks, 14, now);
  const filingDeadlinesMissing = filingDeadlinesMissingDate(tasks);
  let inboxUnread = 0;
  try {
    inboxUnread = await countUnreadInbox();
  } catch {
    inboxUnread = 0;
  }

  const deadlines30 = upcomingDeadlines(tasks, 30, now);
  const liveNotes = demo ? [] : await listAllNotes();
  let inboxAudit = seed?.auditLog ?? [];
  try {
    inboxAudit = [...inboxAudit, ...inboxToActivityEntries(inboxItems, 7, now)];
  } catch {
    /* keep seed audit log only */
  }
  const allNotes = demo ? (seed?.notes ?? []) : liveNotes;
  const attention = mattersNeedingAttention(matters, allNotes, tasks, now);
  const pulse = practicePulse(matters, allNotes, tasks, now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const workThisMonth = rollUpWorkSince(allNotes, monthStart);
  const untimedNotes = notesMissingTime(allNotes).length;
  const activity = recentActivity({
    notes: allNotes,
    completedTasks: demo
      ? (seed?.tasks.filter((t) => t.status === "Done") ?? [])
      : tasks.filter((t) => t.status === "Done"),
    auditLog: inboxAudit,
    days: 7,
    now,
  });

  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const partnerLink = partnerSubmissionUrl();

  const statusCounts = [...new Set(matters.map((m) => m.status || "Unknown"))]
    .map((name) => ({ name, value: matters.filter((m) => (m.status || "Unknown") === name).length }))
    .filter((row) => row.value > 0);
  const caseTypeCounts = [...new Set(matters.map((m) => m.caseType).filter(Boolean))]
    .map((name) => ({ name, value: matters.filter((m) => m.caseType === name).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const lifecycleBreakdown = matterLifecycleBreakdown(matters);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{greeting(displayName, now)}</h1>
          <p className="text-sm text-slate-600">{todayLabel}</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {overflowWelcomeSubtitle(session?.email)}
          </p>
          {demo ? (
            <p className="mt-1 text-xs text-slate-500">
              {quotaFallback
                ? "Previous data provider API limit reached — showing bundled sample data. Connect Google Sheets in Settings to avoid quota billing."
                : "Showing sample data. Connect Google Sheets in Settings to load live matters."}
            </p>
          ) : usesGoogleSheets() ? (
            <p className="mt-1 text-xs text-slate-500">
              Data source: {dataStoreLabel()}.{" "}
              <Link href="/settings" className="font-medium text-sky-800 underline-offset-2 hover:underline">
                Open spreadsheet →
              </Link>
            </p>
          ) : null}
          <p className="mt-2 text-sm">
            <Link href="/help" className="font-medium text-sky-800 underline-offset-2 hover:underline">
              How this works →
            </Link>
          </p>
        </div>
        <Link
          href="/assignments/new"
          className={`${btnPrimary} inline-flex items-center gap-2 whitespace-nowrap`}
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          New assignment
        </Link>
      </header>

      <OnboardingWizard />
      <GettingStartedBanner />
      <ResumeIntakeBanner />

      <section className="rounded-lg border border-sky-200 bg-sky-50/40 px-4 py-3 text-sm text-sky-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong>Partner submission link</strong> — send external firms to submit overflow work with quoted flat fees.
            <p className="mt-1 font-mono text-xs text-sky-900">{partnerLink}</p>
          </div>
          <CopyLinkButton url={partnerLink} label="Copy partner link" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/assignments/new"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/40"
        >
          <FilePlus2 className="h-5 w-5 shrink-0 text-sky-800" aria-hidden />
          <div>
            <p className="font-medium text-slate-900">New assignment</p>
            <p className="text-xs text-slate-600">Start drafting on a new matter</p>
          </div>
        </Link>
        <Link
          href="/inbox"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
        >
          <Inbox className="h-5 w-5 shrink-0 text-violet-800" aria-hidden />
          <div>
            <p className="font-medium text-slate-900">Review inbox</p>
            <p className="text-xs text-slate-600">
              {overflow.deliverablesInReview > 0
                ? `${overflow.deliverablesInReview} deliverable${overflow.deliverablesInReview === 1 ? "" : "s"} awaiting sign-off`
                : "Assignments and agent alerts"}
            </p>
          </div>
        </Link>
        <Link
          href="/matters"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <Briefcase className="h-5 w-5 shrink-0 text-emerald-800" aria-hidden />
          <div>
            <p className="font-medium text-slate-900">Open matters</p>
            <p className="text-xs text-slate-600">{matters.length} in caseload</p>
          </div>
        </Link>
        <Link
          href="/firm-memory"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50/40"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
          <div>
            <p className="font-medium text-slate-900">Firm Memory</p>
            <p className="text-xs text-slate-600">
              {firmMemory.configured ? "Style profile configured" : "Set up before first pilot"}
            </p>
          </div>
        </Link>
      </section>

      {/*
        These four measure the practice, not the overflow-counsel marketplace.
        The previous row counted partner submissions and deliverables in
        review — metrics for a business this firm does not run, which read
        zero while real cases sat quiet for months.
      */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Needs your attention"
          value={pulse.needsAttention}
          hint={
            pulse.needsAttention > 0
              ? "Gone quiet, never started, or nothing scheduled"
              : "Every open matter is moving"
          }
          icon={AlertTriangle}
          tone={pulse.needsAttention > 0 ? "attention" : "positive"}
        />
        <KpiCard
          label="Due in 14 days"
          value={pulse.dueSoon}
          hint="Matters with a deadline coming up"
          icon={CalendarClock}
          tone={pulse.dueSoon > 0 ? "attention" : "neutral"}
        />
        <KpiCard
          label="Open matters"
          value={pulse.openMatters}
          hint={`${pulse.onTrack} moving and scheduled`}
          icon={Briefcase}
          tone="neutral"
          href="/matters"
        />
        <KpiCard
          label="Billable hours logged"
          value={toBillableHours(workThisMonth.billableMinutes)}
          hint={
            untimedNotes > 0
              ? `This month · ${untimedNotes} note${untimedNotes === 1 ? "" : "s"} with no time logged`
              : "This month, from notes you logged time on"
          }
          icon={Clock3}
          tone={untimedNotes > 0 ? "attention" : "positive"}
        />
      </section>

      {attention.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Needs your attention</h2>
            <Link href="/matters" className="text-xs text-slate-500 underline-offset-2 hover:underline">
              All matters →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {attention.slice(0, 6).map((item) => (
              <li
                key={item.matter.matterId}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
              >
                <Link
                  href={`/matters/${item.matter.matterId}`}
                  className="font-medium text-slate-900 underline-offset-2 hover:underline"
                >
                  {item.matter.title || item.matter.clientName}
                </Link>
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{item.matter.caseType}</span>
                  <span
                    className={
                      item.reason === "no_deadline"
                        ? "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900"
                        : "rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-900"
                    }
                  >
                    {item.label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {attention.length > 6 ? (
            <p className="mt-2 text-xs text-slate-500">
              +{attention.length - 6} more on the Matters page.
            </p>
          ) : null}
        </section>
      ) : null}

      {!firmMemory.configured ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <strong>Firm Memory:</strong>{" "}
          <Link href="/firm-memory" className="font-medium underline-offset-2 hover:underline">
            Set up your firm profile
          </Link>{" "}
          so overflow counsel drafts read like your in-house associate.
        </section>
      ) : null}

      {/*
        Drafting/review counts belong here rather than in the headline row —
        they matter, but "which client needs me" comes first.
      */}
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Drafts awaiting your review"
          value={overflow.deliverablesInReview}
          hint="Ready for your sign-off"
          icon={Inbox}
          tone={overflow.deliverablesInReview > 0 ? "attention" : "neutral"}
          href="/inbox"
        />
        <KpiCard
          label="Completed this month"
          value={overflow.completedThisMonth}
          hint="Approved deliverables"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiCard
          label="Firm Memory saved"
          value={firmMemory.templateCount + firmMemory.sampleCount + firmMemory.stylePreferenceCount}
          hint={
            firmMemory.configured
              ? `${firmMemory.templateCount} templates · ${firmMemory.sampleCount} samples · ${firmMemory.stylePreferenceCount} style prefs`
              : "Upload samples so drafts read in your style"
          }
          icon={Sparkles}
          tone={firmMemoryPct >= 66 ? "positive" : "attention"}
          href="/firm-memory"
        />
      </section>

      <DashboardCharts statusCounts={statusCounts} caseTypeCounts={caseTypeCounts} />

      {demo || usesGoogleSheets() ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-slate-900">Matters by lifecycle stage</h2>
          <p className="text-xs text-slate-500">
            Where your caseload actually stands — updates automatically as matters move.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {lifecycleBreakdown.map(({ stage, count }) => (
              <div
                key={stage}
                className="flex min-w-[120px] flex-1 items-center justify-between rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <span className="text-xs font-medium text-slate-700">{stage}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Upcoming deadlines (next 30 days)</h2>
          <p className="text-xs text-slate-500">Internal matter deadlines — not overflow assignment due dates.</p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2">Matter</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Days until</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {deadlines30.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-2">
                  <EmptyState
                    icon={Clock3}
                    title="No deadlines in the next 30 days."
                    description="Matter task deadlines will appear here when scheduled."
                  />
                </td>
              </tr>
            ) : (
              deadlines30.map((t) => {
                const matter = matterIndex.get(t.matterId);
                const filing = t.isFilingDeadline;
                return (
                  <tr
                    key={t.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 ${
                      filing ? "border-l-4 border-l-amber-400" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Link className={linkMatter} href={`/matters/${t.matterId}`}>
                        {t.matterId}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDate(t.dueDate)}</td>
                    <td className="px-4 py-2 tabular-nums">{daysUntil(t.dueDate, now) ?? "—"}</td>
                    <td className="px-4 py-2">{t.priority}</td>
                    <td className="px-4 py-2">
                      {t.assignedTo || matter?.assignedAttorney || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filingDeadlines14 > 0 ? (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            {filingDeadlines14} filing deadline{filingDeadlines14 === 1 ? "" : "s"} in the next 14 days.
          </p>
        ) : null}
        {filingDeadlinesMissing > 0 ? (
          <p className="border-t border-rose-100 bg-rose-50/60 px-4 py-2 text-xs font-medium text-rose-800">
            {filingDeadlinesMissing} filing deadline{filingDeadlinesMissing === 1 ? "" : "s"} still need
            {filingDeadlinesMissing === 1 ? "s" : ""} a date — won&apos;t show above or on the calendar until
            set. Open the matter&apos;s Tasks tab to add one.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Recent activity</h2>
          <p className="text-xs text-slate-500">Last 7 days — notes, completed tasks, and overflow workflow.</p>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity yet."
            description="Submit an assignment or upload a case assessment to get started."
          />
        ) : (
          <ol className="divide-y divide-slate-100">
            {activity.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <Link className={linkMatter} href={`/matters/${entry.matterId}`}>
                    {entry.matterId}
                  </Link>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {entry.kind.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-slate-800">{entry.summary}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
