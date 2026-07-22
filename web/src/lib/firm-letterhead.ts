/**
 * Firm letterhead + certificate of service — browser-persisted firm profile.
 * Source of truth for smart-template assembly (never invent fake firm addresses).
 */

const STORAGE_KEY = "aod_firm_letterhead_v1";

/** Standard certificate structure with merge fields (TXDocs / HotDocs-style). */
export const DEFAULT_CERTIFICATE_OF_SERVICE = `CERTIFICATE OF SERVICE

I hereby certify that on {{date}}, I served a true and correct copy of the foregoing document by {{method}} upon:

{{parties_served}}

_______________________________
{{attorney_name}}
{{bar_number}}
Attorney for Respondent`;

export type FirmLetterheadProfile = {
  firmName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  attorneyName: string;
  barNumber: string;
  /** Certificate of service body — supports {{date}}, {{method}}, {{parties_served}}. */
  certificateOfService: string;
  updatedAt?: string;
};

export const EMPTY_FIRM_LETTERHEAD: FirmLetterheadProfile = {
  firmName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  attorneyName: "",
  barNumber: "",
  certificateOfService: DEFAULT_CERTIFICATE_OF_SERVICE,
};

export const LETTERHEAD_EMPTY_HINT =
  "Add firm letterhead in Settings → Firm profile (name, address, phone, email, bar number).";

function readRaw(): FirmLetterheadProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirmLetterheadProfile>;
    return {
      ...EMPTY_FIRM_LETTERHEAD,
      ...parsed,
      certificateOfService:
        typeof parsed.certificateOfService === "string" && parsed.certificateOfService.trim()
          ? parsed.certificateOfService
          : DEFAULT_CERTIFICATE_OF_SERVICE,
    };
  } catch {
    return null;
  }
}

export function getFirmLetterhead(): FirmLetterheadProfile {
  return readRaw() ?? { ...EMPTY_FIRM_LETTERHEAD };
}

export function saveFirmLetterhead(patch: Partial<FirmLetterheadProfile>): FirmLetterheadProfile {
  const next: FirmLetterheadProfile = {
    ...getFirmLetterhead(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearFirmLetterhead(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** True when firm name or address is set (not just defaults). */
export function hasFirmLetterhead(profile?: FirmLetterheadProfile): boolean {
  const p = profile ?? getFirmLetterhead();
  return Boolean(p.firmName.trim() || p.addressLine1.trim() || p.phone.trim() || p.email.trim());
}

/** Format letterhead block for previews / filled templates. Empty → placeholder hint. */
export function formatFirmLetterhead(profile?: FirmLetterheadProfile): string {
  const p = profile ?? getFirmLetterhead();
  if (!hasFirmLetterhead(p)) {
    return `[${LETTERHEAD_EMPTY_HINT}]`;
  }
  const cityLine = [p.city, p.state, p.zip].filter(Boolean).join(", ").replace(/,\s+,/g, ",").trim();
  const lines = [
    p.firmName.trim() || undefined,
    p.addressLine1.trim() || undefined,
    p.addressLine2.trim() || undefined,
    cityLine || undefined,
    p.phone.trim() ? `Tel: ${p.phone.trim()}` : undefined,
    p.email.trim() || undefined,
    p.attorneyName.trim() || undefined,
    p.barNumber.trim() ? `Bar No. ${p.barNumber.trim()}` : undefined,
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

/** Values for certificate / letterhead merge into assembly. */
export function letterheadMergeValues(profile?: FirmLetterheadProfile): Record<string, string> {
  const p = profile ?? getFirmLetterhead();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return {
    firm_name: p.firmName.trim(),
    firm_address: [p.addressLine1, p.addressLine2, [p.city, p.state, p.zip].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join("\n"),
    firm_phone: p.phone.trim(),
    firm_email: p.email.trim(),
    attorney_name: p.attorneyName.trim() || "[Attorney Name]",
    bar_number: p.barNumber.trim() ? `Bar No. ${p.barNumber.trim()}` : "[Bar No. _____]",
    date: today,
  };
}
