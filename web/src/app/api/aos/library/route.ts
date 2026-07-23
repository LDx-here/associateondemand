import { NextResponse } from "next/server";

import library from "../../../../../public/aos/AOS_Paragraph_Library.json";
import type {
  AosCaseTheme,
  AosLibraryResponse,
  AosNovelAlert,
  AosVariantGroup,
} from "@/lib/aos-library";

type RawVariant = {
  variant_id?: string;
  label?: string;
  description?: string;
  paragraph?: string;
};

type RawEntry = {
  display_name?: string;
  trigger_conditions?: Record<string, unknown>;
  citations_required?: string[];
  variants?: RawVariant[];
  paragraph?: string;
};

const lib = library as unknown as {
  version?: string;
  firm?: string;
  brief_type?: string;
  case_theme_templates?: Record<string, unknown>;
  equity?: Record<string, RawEntry>;
  adverse?: Record<string, RawEntry>;
  balancing?: Record<string, RawEntry>;
  selection_logic?: { novel_combination_alerts?: AosNovelAlert[] };
};

function normalizeGroups(section?: Record<string, RawEntry>): AosVariantGroup[] {
  if (!section) return [];
  const groups: AosVariantGroup[] = [];
  for (const [key, entry] of Object.entries(section)) {
    if (key.startsWith("_") || !entry || typeof entry !== "object") continue;
    const rawVariants = Array.isArray(entry.variants) ? entry.variants : [];
    // Support legacy flat `paragraph` entries with no variants array.
    const source: RawVariant[] = rawVariants.length
      ? rawVariants
      : entry.paragraph
        ? [{ variant_id: "v1", label: entry.display_name, paragraph: entry.paragraph }]
        : [];
    const variants = source
      .filter((v) => v && v.paragraph)
      .map((v) => {
        const variantId = String(v.variant_id || "v1");
        return {
          id: `${key}.${variantId}`,
          key,
          variantId,
          label: v.label || `${entry.display_name ?? key} (${variantId})`,
          description: v.description,
          paragraph: String(v.paragraph),
          citations: Array.isArray(entry.citations_required) ? entry.citations_required : undefined,
        };
      });
    if (!variants.length) continue;
    groups.push({
      key,
      displayName: entry.display_name || key,
      triggerConditions: entry.trigger_conditions,
      variants,
    });
  }
  return groups;
}

function normalizeCaseThemes(raw?: Record<string, unknown>): AosCaseTheme[] {
  if (!raw) return [];
  const themes: AosCaseTheme[] = [];
  for (const [group, value] of Object.entries(raw)) {
    if (group.startsWith("_")) continue;
    if (Array.isArray(value)) {
      for (const text of value) {
        if (typeof text === "string" && text.trim()) themes.push({ group, text });
      }
    }
  }
  return themes;
}

export function GET() {
  const payload: AosLibraryResponse = {
    version: String(lib.version ?? "unknown"),
    firm: lib.firm,
    briefType: lib.brief_type,
    caseThemes: normalizeCaseThemes(lib.case_theme_templates),
    equity: normalizeGroups(lib.equity),
    adverse: normalizeGroups(lib.adverse),
    balancing: normalizeGroups(lib.balancing),
    novelCombinationAlerts: Array.isArray(lib.selection_logic?.novel_combination_alerts)
      ? (lib.selection_logic?.novel_combination_alerts as AosNovelAlert[])
      : [],
  };
  return NextResponse.json(payload);
}
