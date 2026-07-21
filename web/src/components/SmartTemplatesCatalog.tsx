"use client";

import { listTemplateFieldMaps } from "@/lib/template-field-maps";
import { editableFieldsForMap } from "@/lib/template-field-maps";

/** Static catalog of smart template field maps on /templates. */
export function SmartTemplatesCatalog() {
  const maps = listTemplateFieldMaps();
  if (!maps.length) return null;

  return (
    <section id="smart-templates" className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4">
      <h2 className="text-sm font-semibold text-sky-950">Smart templates (field maps)</h2>
      <p className="text-sm text-sky-900/80">
        Each template defines editable regions vs locked boilerplate. Apply on a matter Overview tab or upload
        a sample in Firm Memory to extend maps (optional AI field detection on upload).
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {maps.map((map) => (
          <li key={map.id} className="rounded-md border border-sky-100 bg-white p-3 text-sm shadow-sm">
            <p className="font-semibold text-slate-900">{map.name}</p>
            <p className="mt-1 text-xs text-slate-600">{map.description}</p>
            <p className="mt-2 text-xs text-violet-800">
              {editableFieldsForMap(map).length} editable fields · {map.boilerplateSections.length} locked
              sections
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
