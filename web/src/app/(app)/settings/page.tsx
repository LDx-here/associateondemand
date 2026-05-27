import { listPeopleFromAirtable } from "@/lib/airtable/queries";
import { useDemoMode } from "@/lib/data-store";

export const dynamic = "force-dynamic";

const CURRENT_ATTORNEY_EMAIL = "ladajia@recovermyvalue.com";

function maskPat(value: string | undefined): string {
  if (!value) return "Not configured";
  if (value.length <= 8) return "*****";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

export default async function SettingsPage() {
  const demo = useDemoMode();
  const baseId = process.env.AIRTABLE_BASE_ID ?? "";
  const pat = process.env.AIRTABLE_PAT;
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
          Read-only system summary. Editable fields land in Phase 7 with auth.
        </p>
      </header>

      <SettingsSection title="Profile">
        {demo ? (
          <Row label="Mode">Demo data — sign-in profile is unavailable.</Row>
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
            No People row matched <code className="rounded bg-slate-100 px-1">{CURRENT_ATTORNEY_EMAIL}</code>.
            Seed one with{" "}
            <code className="rounded bg-slate-100 px-1">node scripts/airtable-bootstrap.mjs</code>.
          </Row>
        )}
      </SettingsSection>

      <SettingsSection title="Airtable connection">
        <Row label="Base id">
          <code className="rounded bg-slate-100 px-1">{baseId || "Not configured"}</code>
        </Row>
        <Row label="PAT">
          <code className="rounded bg-slate-100 px-1">{maskPat(pat)}</code>
        </Row>
        <Row label="Status">
          {demo ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Demo data
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
              Live
            </span>
          )}
        </Row>
      </SettingsSection>

      <SettingsSection title="Privacy &amp; security">
        <Row label="PII tier">
          {`Tier ${piiTier}`}
          <span className="ml-2 text-xs text-slate-500">
            (`NEXT_PUBLIC_PII_TIER`)
          </span>
        </Row>
        <Row label="Auth">
          {authEnabled ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
              Enabled
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              Middleware stub (`AOD_AUTH_ENABLED=false`)
            </span>
          )}
        </Row>
      </SettingsSection>

      <SettingsSection title="Documentation">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            <a
              className="text-sky-700 hover:underline"
              href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/runbooks/local-dev.md"
              rel="noreferrer"
              target="_blank"
            >
              docs/runbooks/local-dev.md
            </a>
          </li>
          <li>
            <a
              className="text-sky-700 hover:underline"
              href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/constitution/BUILD_SPEC.md"
              rel="noreferrer"
              target="_blank"
            >
              docs/constitution/BUILD_SPEC.md
            </a>
          </li>
          <li>
            <a
              className="text-sky-700 hover:underline"
              href="https://github.com/LDx-here/associateondemand/blob/cursor/phase0-foundation/docs/constitution/BUILD_SPEC-GAP-AUDIT.md"
              rel="noreferrer"
              target="_blank"
            >
              docs/constitution/BUILD_SPEC-GAP-AUDIT.md
            </a>
          </li>
        </ul>
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
