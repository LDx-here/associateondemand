/**
 * Firm billing settings — her hourly rate, payment terms, and email signature.
 *
 * Stored on the firm-level matter rather than in the browser. An hourly rate
 * that lives in localStorage disappears when she opens the app on her phone or
 * a second machine, and a billing feature that blocks until you re-enter your
 * rate is a billing feature you stop using.
 *
 * The rate deliberately starts unset. A default would put a number on a real
 * client's invoice that she never chose, which is worse than asking once.
 */

export type BillingSettings = {
  v: 1;
  /** Hourly rate in cents. Null until she sets it. */
  hourlyRateCents: number | null;
  /** Days until an invoice is due. */
  termDays: number;
  /** Signed at the bottom of invoice emails. */
  signature: string;
  updatedAt?: string;
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  v: 1,
  hourlyRateCents: null,
  termDays: 30,
  signature: "",
};

export const BILLING_SETTINGS_NOTE_TYPE = "Billing Settings";

export function normalizeBillingSettings(input: unknown): BillingSettings {
  const parsed = (input ?? {}) as Partial<BillingSettings>;
  const rate = parsed.hourlyRateCents;
  const term = parsed.termDays;
  return {
    v: 1,
    // A zero or negative rate is treated as unset, so invoicing stays blocked
    // rather than producing $0.00 lines.
    hourlyRateCents: typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? Math.round(rate) : null,
    termDays: typeof term === "number" && Number.isFinite(term) && term > 0 ? Math.round(term) : 30,
    signature: typeof parsed.signature === "string" ? parsed.signature : "",
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
  };
}

export function serializeBillingSettings(settings: BillingSettings): string {
  return `${BILLING_SETTINGS_NOTE_TYPE}\n${JSON.stringify({
    ...settings,
    updatedAt: new Date().toISOString(),
  })}`;
}

export function parseBillingSettingsNote(content: string): BillingSettings {
  const body = content.startsWith(BILLING_SETTINGS_NOTE_TYPE)
    ? content.slice(BILLING_SETTINGS_NOTE_TYPE.length).trim()
    : content.trim();
  if (!body) return { ...DEFAULT_BILLING_SETTINGS };
  try {
    return normalizeBillingSettings(JSON.parse(body));
  } catch {
    return { ...DEFAULT_BILLING_SETTINGS };
  }
}

export function hasBillingRate(settings: BillingSettings | null | undefined): boolean {
  return Boolean(settings?.hourlyRateCents);
}
