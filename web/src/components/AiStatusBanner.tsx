import { AlertTriangle } from "lucide-react";

/**
 * Surfaces a rejected AI key as an error instead of letting it degrade
 * silently into template output.
 *
 * The distinction this draws is the whole point: a key that is *not set* is a
 * quiet, expected state, while a key that is set and *rejected* is a
 * configuration failure that has been silently changing the quality of every
 * draft. That second case used to be invisible — logged at warning level,
 * presented in the UI as normal output.
 */

type AiStatus = {
  configured: boolean;
  working: boolean;
  reason: string;
  detail: string;
  model: string;
};

async function fetchAiStatus(): Promise<AiStatus | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const resp = await fetch(`${base.replace(/\/$/, "")}/ai-status`, {
      cache: "no-store",
      // Never let a slow API block the page it is rendered on.
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as AiStatus;
  } catch {
    // The banner is a diagnostic, not a dependency — a failed check stays quiet.
    return null;
  }
}

export async function AiStatusBanner() {
  const status = await fetchAiStatus();

  // Working, unreachable, or genuinely unconfigured — nothing to shout about.
  if (!status || status.working || !status.configured) return null;

  return (
    <section
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden />
      <div>
        <p className="font-semibold">AI drafting is not working — output is template only</p>
        <p className="mt-1">{status.detail}</p>
        <p className="mt-2 text-xs text-rose-900">
          Every draft, summary, and suggestion is falling back to a fixed template until this
          is fixed. Verify a new key before deploying it with{" "}
          <code className="rounded bg-rose-100 px-1">bash scripts/check-anthropic-key.sh &lt;key&gt;</code>.
        </p>
      </div>
    </section>
  );
}
