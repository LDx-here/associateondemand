import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Canonical date formatter for the whole app — `medium` style yields
 * "May 26, 2026" (no "5/26/2026" mixed with "May 26", per BUILD_SPEC
 * §7 polish). Falls back to an em dash when the value is null / empty
 * / invalid so columns never render the JS string "Invalid Date".
 */
const MEDIUM_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return MEDIUM_DATE_FORMATTER.format(d);
}
