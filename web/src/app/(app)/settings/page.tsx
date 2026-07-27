import Link from "next/link";

import { SessionAccount } from "@/components/SessionAccount";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { FirmLetterheadSettings } from "@/components/FirmLetterheadSettings";
import { FirmMemorySetup } from "@/components/FirmMemorySetup";
import { PiiTierComplianceSection } from "@/components/PiiTierComplianceSection";
import {
  dataStoreLabel,
  getDataStoreKind,
  isDemoMode,
  usesGoogleSheets,
} from "@/lib/data-store-config";
import { getSpreadsheetUrl } from "@/lib/google-sheets/client";
import { billingNoteForPartnerFirm } from "@/lib/deliverable-catalog";
import { partnerSubmissionUrl } from "@/lib/partner-submission";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

const CURRENT_ATTORNEY_EMAIL = "ladajia@recovermyvalue.com";

function piiTierLabel(tier: string): string {
  switch (tier) {
    case "0":
      return "Documents: manual review only";
    case "1":
      return "Documents: automated checks with attorney sign-off";
    case "2":
      return "Documents: expanded automation (supervised)";
    default:
      return "Documents: policy tier not configured";
  }
}

export default async function SettingsPage() {
  const demo = isDemoMode();
  const dataKind = getDataStoreKind();
  const spreadsheetUrl = usesGoogleSheets() ? getSpreadsheetUrl() : null;
  const piiTier = process.env.NEXT_PUBLIC_PII_TIER ?? "0";
  const authEnabled =
    (process.env.AOD_AUTH_ENABLED ?? "false").toLowerCase() === "true";
  const stripeConnected = isStripeConfigured();
  const stripeTestMode = stripeConnected && isStripeTestMode();
  const billingNote = billingNoteForPartnerFirm();
  const partnerLink = partnerSubmissionUrl();

  let attorney: { name: string; role: string; email: string; isActive: boolean } | null = null;
  if (!demo && !usesGoogleSheets()) {
    try {
      const { listPeopleFromAirtable } = await import("@/lib/airtable/queries");
      const people = await listPeopleFromAirtable();
      attorney =
        people.find(
          (p) => p.email.toLowerCase() === CURRENT_ATTORNEY_EMAIL,
        ) ?? null;
    } catch {
      attorney = null;
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">
          Firm profile and connection status. Account editing arrives with sign-in.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/help" className="font-medium text-sky-800 underline-offset-2 hover:underline">
            How this works — site guide →
          </Link>
        </p>
      </header>

      <SettingsSection title="Profile">
        {demo ? (
          <Row label="Mode">Sample data. Connect Google Sheets or Airtable to load live matters.</Row>
        ) : attorney ? (
          <>
            <Row label="Name">{attorney.name}</Row>
            <Row label="Role">{attorney.role}</Row>
            <Row label="Email">{attorney.email}</Row>
            <Row label="Status">
              {attorney.isActive ? "Active" : "Inactive"}
            </Row>
          </>
        ) : (
          <Row label="Profile">
            Your People record is not linked yet. Ask IT to add your profile in Airtable.
          </Row>
        )}
      </SettingsSection>

      <section id="firm-profile" className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Firm profile — letterhead &amp; certificate of service</h2>
        </header>
        <div className="px-4 py-4">
          <FirmLetterheadSettings />
        </div>
      </section>

      <section className="scroll-mt-4">
        <FirmMemorySetup />
        <p className="mt-2 text-xs text-slate-500">
          Full-page view:{" "}
          <Link href="/firm-memory" className="font-medium text-sky-800 underline-offset-2 hover:underline">
            /firm-memory
          </Link>
          . Firm Knowledge (legal elements) lives on the{" "}
          <Link
            href="/knowledge-map#firm-knowledge"
            className="font-medium text-sky-800 underline-offset-2 hover:underline"
          >
            knowledge map
          </Link>
          .
        </p>
      </section>

      <SettingsSection title="Data connection">
        <Row label="Data store">
          {demo ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Sample data
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Connected — {dataStoreLabel()}
            </span>
          )}
        </Row>
        {usesGoogleSheets() && spreadsheetUrl ? (
          <Row label="Google Sheet">
            <a
              className="font-medium text-sky-800 underline-offset-2 hover:underline"
              href={spreadsheetUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open firm spreadsheet
            </a>
            <span className="mt-1 block text-xs text-slate-500">
              Matters and Notes live in this sheet. Export or sort in Google Sheets anytime.
            </span>
          </Row>
        ) : null}
        {!demo && dataKind === "airtable" ? (
          <Row label="Airtable">
            <span className="text-sm text-slate-700">
              Legacy mode — set <code className="text-xs">DATA_STORE=google_sheets</code> to migrate.{" "}
              <a
                className="font-medium text-sky-800 underline-offset-2 hover:underline"
                href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/runbooks/google-sheets-setup.md"
                rel="noreferrer"
                target="_blank"
              >
                Google Sheets setup →
              </a>
            </span>
          </Row>
        ) : null}
        {demo ? (
          <Row label="Setup">
            <a
              className="font-medium text-sky-800 underline-offset-2 hover:underline"
              href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/runbooks/google-sheets-setup.md"
              rel="noreferrer"
              target="_blank"
            >
              Connect Google Workspace (runbook) →
            </a>
          </Row>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Billing">
        <Row label="Overflow counsel billing">
          Partner law firms are invoiced for deliverables. RMV does not pay through this dashboard.
        </Row>
        <Row label="Stripe">
          {stripeConnected ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Connected{stripeTestMode ? " (test mode)" : " (live mode)"} — reserved for external partner checkout (Phase 1)
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Not configured — off-platform invoice to partner firms
            </span>
          )}
        </Row>
        <Row label="Payment flow">{billingNote}</Row>
        <Row label="How partner firms pay">
          RMV sends a flat-fee invoice or Stripe Payment Link after scope is agreed (Phase 0). Partner firms may also pay at secure checkout when submitting via the external funnel (Phase 1).
        </Row>
        <Row label="Partner submission link">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">{partnerLink}</code>
            <CopyLinkButton url={partnerLink} />
          </div>
        </Row>
        {stripeConnected ? (
          <Row label="Stripe dashboard">
            <a
              className="font-medium text-slate-800 underline-offset-2 hover:underline"
              href="https://dashboard.stripe.com/test/payments"
              rel="noreferrer"
              target="_blank"
            >
              Open Stripe Dashboard (test)
            </a>
            {" · "}
            <a
              className="font-medium text-slate-800 underline-offset-2 hover:underline"
              href="https://docs.stripe.com/checkout"
              rel="noreferrer"
              target="_blank"
            >
              Checkout docs
            </a>
          </Row>
        ) : null}
        <Row label="Roadmap">
          $99/mo self-serve AI tier is Phase 3+ only — requires bar counsel approval before any UI or checkout ships.
        </Row>
        <Row label="Associate marketplace">
          Contract-associate marketplace is Phase 3+ — year one is RMV-verified overflow counsel only.
        </Row>
      </SettingsSection>

      <SettingsSection title="Privacy and security">
        <Row label="Document handling">{piiTierLabel(piiTier)}</Row>
        <Row label="Account">
          <SessionAccount />
        </Row>
        <Row label="Sign-in gate">
          {authEnabled ? "AOD_AUTH_ENABLED is on" : "Off for local development"}
        </Row>
      </SettingsSection>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">Technical / compliance</h2>
        </header>
        <div className="px-4 py-4">
          <PiiTierComplianceSection />
        </div>
      </section>

      <SettingsSection title="Production deployment">
        <p className="text-sm text-slate-700">
          Production deploy, auth, and environment configuration are documented for technical staff. Attorneys
          do not need these steps for daily practice.
        </p>
        <p className="mt-2 text-sm">
          <a
            className="font-medium text-slate-800 underline-offset-2 hover:underline"
            href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/runbooks/deploy.md"
            rel="noreferrer"
            target="_blank"
          >
            Production deployment runbook
          </a>
        </p>
      </SettingsSection>

      <SettingsSection title="For IT">
        <p className="text-sm text-slate-700">
          Local setup, environment variables, and deployment steps are documented for technical staff
          only. Stripe env vars: <code className="text-xs">STRIPE_SECRET_KEY</code>,{" "}
          <code className="text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>,{" "}
          <code className="text-xs">STRIPE_WEBHOOK_SECRET</code>.
        </p>
        <p className="mt-2 text-sm">
          <a
            className="font-medium text-slate-800 underline-offset-2 hover:underline"
            href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/runbooks/local-dev.md"
            rel="noreferrer"
            target="_blank"
          >
            Local development runbook
          </a>
        </p>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-medium text-slate-900">{title}</h2>
      </header>
      <dl className="space-y-3 px-4 py-4">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-3 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
