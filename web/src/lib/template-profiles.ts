/**
 * Reusable template profile defaults (browser localStorage).
 * e.g. "Telephonic requests — RMV defaults" saved once, applied on new matters.
 */

import type { TemplateFieldMap } from "./template-field-maps";
import { editableFieldsForMap } from "./template-field-maps";

const STORAGE_KEY = "aod_template_profiles_v1";

export type TemplateProfile = {
  id: string;
  templateId: string;
  name: string;
  values: Record<string, string>;
  updatedAt: string;
};

function readAll(): TemplateProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TemplateProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(profiles: TemplateProfile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function listTemplateProfiles(templateId?: string): TemplateProfile[] {
  const all = readAll();
  if (!templateId) return all;
  return all.filter((p) => p.templateId === templateId);
}

export function getTemplateProfile(id: string): TemplateProfile | undefined {
  return readAll().find((p) => p.id === id);
}

export function saveTemplateProfile(payload: {
  id?: string;
  templateId: string;
  name: string;
  values: Record<string, string>;
}): TemplateProfile {
  const all = readAll();
  const id = payload.id ?? `tp-${Date.now()}`;
  const profile: TemplateProfile = {
    id,
    templateId: payload.templateId,
    name: payload.name.trim(),
    values: payload.values,
    updatedAt: new Date().toISOString(),
  };
  const idx = all.findIndex((p) => p.id === id);
  if (idx >= 0) all[idx] = profile;
  else all.push(profile);
  writeAll(all);
  return profile;
}

export function deleteTemplateProfile(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function emptyValuesForMap(map: TemplateFieldMap): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of editableFieldsForMap(map)) {
    values[field.id] = "";
  }
  return values;
}
