import Link from "next/link";
import {
  Activity,
  Briefcase,
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
  const activity = recentActivity({
    notes: demo ? (seed?.notes ?? []) : liveNotes,
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
            <p className="text-xs text-slate-600">Submit overflow work to RMV</p>
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Hours saved this month"
          value={overflow.hoursSavedThisMonth}
          hint="Estimated from completed overflow deliverables"
          icon={Clock3}
          tone="positive"
        />
        <KpiCard
          label="Deliverables in review"
          value={overflow.deliverablesInReview}
          hint="Ready for your sign-off"
          icon={Inbox}
          tone={overflow.deliverablesInReview > 0 ? "attention" : "neutral"}
        />
        <KpiCard
          label="Open assignments"
          value={overflow.openAssignments}
          hint="Submitted or in progress with RMV"
          icon={Briefcase}
          tone="neutral"
        />
        <KpiCard
          label="Firm Memory saved"
          value={firmMemory.templateCount + firmMemory.sampleCount + firmMemory.stylePreferenceCount}
          hint={
            firmMemory.configured
              ? `${firmMemory.templateCount} templates · ${firmMemory.sampleCount} samples · ${firmMemory.stylePreferenceCount} style prefs`
              : "Upload samples at Firm Memory to teach your firm's style"
          }
          icon={Sparkles}
          tone={firmMemoryPct >= 66 ? "positive" : "attention"}
          href="/firm-memory"
        />
      </section>

      {!firmMemory.configured ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <strong>Firm Memory:</strong>{" "}
          <Link href="/firm-memory" className="font-medium underline-offset-2 hover:underline">
            Set up your firm profile
          </Link>{" "}
          so overflow counsel drafts read like your in-house associate.
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Active projects"
          value={overflow.activeProjects}
          hint="Assignments in your overflow pipeline"
          icon={Briefcase}
        />
        <KpiCard
          label="Completed this month"
          value={overflow.completedThisMonth}
          hint="Approved deliverables — capacity you did not have to draft"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiCard
          label="Inbox items open"
          value={inboxUnread}
          hint="Assignments and alerts awaiting action"
          icon={Inbox}
          tone={inboxUnread > 0 ? "attention" : "neutral"}
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
