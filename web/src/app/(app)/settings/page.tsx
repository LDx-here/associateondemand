import { SessionAccount } from "@/components/SessionAccount";
import { listPeopleFromAirtable } from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";

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
  const demo = useDemoMode();
  const piiTier = process.env.NEXT_PUBLIC_PII_TIER ?? "0";
  const authEnabled =
    (process.env.AOD_AUTH_ENABLED ?? "false").toLowerCase() === "true";

  let attorney: { name: string; role: string; email: string; isActive: boolean } | null = null;
  if (!demo) {
    try {
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
      </header>

      <SettingsSection title="Profile">
        {demo ? (
          <Row label="Mode">Sample data. Connect Airtable to load live matters.</Row>
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

      <SettingsSection title="Data connection">
        <Row label="Airtable">
          {demo ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Sample data
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Connected to Airtable
            </span>
          )}
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
          only.
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
