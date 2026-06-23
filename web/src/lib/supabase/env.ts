/** Auth gating: enabled flag plus non-placeholder Supabase public config. */

const PLACEHOLDER_MARKERS = ["replace_me", "your-project", "placeholder"];

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

export function isAuthEnabledFlag(): boolean {
  return (process.env.AOD_AUTH_ENABLED ?? "false").toLowerCase() === "true";
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (isPlaceholder(url) || isPlaceholder(anonKey)) return null;
  return { url: url!, anonKey: anonKey! };
}

/** True when middleware should enforce a Supabase session on (app) routes. */
export function shouldEnforceAuth(): boolean {
  return isAuthEnabledFlag() && getSupabasePublicConfig() !== null;
}
