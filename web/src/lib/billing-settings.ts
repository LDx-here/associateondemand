/**
 * Firm billing settings — her hourly rate and payment terms.
 *
 * Same storage model as firm-letterhead.ts: browser-local, single user, no new
 * infrastructure. The rate deliberately starts unset. A default rate would put
 * a number on a real client's invoice that she never chose, which is worse
 * than asking once.
 */

const STORAGE_KEY = "aod.billing.v1";

export type BillingSettings = {
  /** Hourly rate in cents. Null until she sets it. */
  hourlyRateCents: number | null;
  /** Days until an invoice is due. */
  termDays: number;
  /** Signed at the bottom of invoice emails. */
  signature: string;
  updatedAt?: string;
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  hourlyRateCents: null,
  termDays: 30,
  signature: "",
};

export function getBillingSettings(): BillingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_BILLING_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BILLING_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<BillingSettings>;
    return {
      ...DEFAULT_BILLING_SETTINGS,
      ...parsed,
      hourlyRateCents:
        typeof parsed.hourlyRateCents === "number" && parsed.hourlyRateCents > 0
          ? parsed.hourlyRateCents
          : null,
      termDays:
        typeof parsed.termDays === "number" && parsed.termDays > 0 ? parsed.termDays : 30,
    };
  } catch {
    return { ...DEFAULT_BILLING_SETTINGS };
  }
}

export function saveBillingSettings(patch: Partial<BillingSettings>): BillingSettings {
  const next: BillingSettings = {
    ...getBillingSettings(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private window); the rate stays for this
      // session rather than throwing in the middle of building an invoice.
    }
  }
  return next;
}

export function hasBillingRate(settings?: BillingSettings): boolean {
  return Boolean((settings ?? getBillingSettings()).hourlyRateCents);
}
