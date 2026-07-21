"use client";

import { useState } from "react";

import { TemplatePreviewStandalone } from "@/components/TemplateApplyPanel";
import { formatSpecIncludes, specForTemplateFieldMap } from "@/lib/deliverable-template-specs";
import { editableFieldsForMap, listTemplateFieldMaps } from "@/lib/template-field-maps";
import { btnSecondary } from "@/lib/ui-classes";

/** Interactive smart template catalog on /templates — fields are real inputs, not static counts. */
export function SmartTemplatesCatalog() {
  const maps = listTemplateFieldMaps();
  const [expandedId, setExpandedId] = useState<string | null>(maps[0]?.id ?? null);

  if (!maps.length) return null;

  return (
    <section id="smart-templates" className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4">
      <h2 className="text-sm font-semibold text-sky-950">Smart templates</h2>
      <p className="text-sm text-sky-900/80">
        Click <strong>Configure &amp; preview</strong> to fill editable fields, view the blank form, and
        generate a draft. Locked boilerplate preserves your firm structure. Upload your own PDF samples in{" "}
        <a href="#firm-memory" className="font-medium text-violet-800 underline">
          Firm Memory
        </a>{" "}
        to teach tone and format.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {maps.map((map) => {
          const spec = specForTemplateFieldMap(map.id);
          const expanded = expandedId === map.id;
          return (
            <li key={map.id} className="rounded-md border border-sky-100 bg-white p-3 text-sm shadow-sm">
              <p className="font-semibold text-slate-900">{map.name}</p>
              <p className="mt-1 text-xs text-slate-600">{map.description}</p>
              <p className="mt-2 text-xs text-violet-800">
                {editableFieldsForMap(map).length} editable fields · {map.boilerplateSections.length} locked
                sections
              </p>
              {spec ? (
                <p className="mt-1 text-xs text-slate-500">Includes: {formatSpecIncludes(spec)}</p>
              ) : null}
              <button
                type="button"
                className={`${btnSecondary} mt-3 text-xs`}
                onClick={() => setExpandedId(expanded ? null : map.id)}
                aria-expanded={expanded}
              >
                {expanded ? "Hide preview" : "Configure & preview"}
              </button>
              {expanded ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <TemplatePreviewStandalone templateId={map.id} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
