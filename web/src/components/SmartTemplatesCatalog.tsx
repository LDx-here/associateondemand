"use client";

import { useState } from "react";

import { TemplatePreviewStandalone } from "@/components/TemplateApplyPanel";
import { formatSpecIncludes, specForTemplateFieldMap } from "@/lib/deliverable-template-specs";
import {
  editableFieldsForMap,
  listTemplateFieldMaps,
  structureSectionCounts,
} from "@/lib/template-field-maps";
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
        Click <strong>Configure &amp; preview</strong> to fill merge fields and assemble a draft (TXDocs-style).
        Letterhead and certificate of service come from{" "}
        <a href="/settings#firm-profile" className="font-medium text-violet-800 underline">
          Settings → Firm profile
        </a>
        . Upload firm DOCX per SKU below to replace the default system outline — not a parallel invented HTML
        form. See{" "}
        <a href="#how-templates-work" className="font-medium text-sky-900 underline">
          How templates work
        </a>
        .
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {maps.map((map) => {
          const spec = specForTemplateFieldMap(map.id);
          const counts = structureSectionCounts(map);
          const expanded = expandedId === map.id;
          return (
            <li key={map.id} className="rounded-md border border-sky-100 bg-white p-3 text-sm shadow-sm">
              <p className="font-semibold text-slate-900">{map.name}</p>
              <p className="mt-1 text-xs text-slate-600">{map.description}</p>
              <p className="mt-2 text-xs text-violet-800">
                {editableFieldsForMap(map).length} merge fields · {counts.firmEditable} firm-editable ·{" "}
                {counts.builtIn + counts.preserve} built-in / preserve
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
