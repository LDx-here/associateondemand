"use client";

import { BookOpen, ClipboardList, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ExtractedFactsReview } from "@/components/ExtractedFactsReview";
import {
  findCaseAssessmentDocument,
  factDisplayLabel,
  matterPracticeArea,
  normalizeExtractedFacts,
  parseAssessmentOcrPayload,
  type AssessmentOcrPayload,
} from "@/lib/assessment-documents";
import {
  firmMemoryReferenceHref,
  formatLinkedFacts,
  legalElementTemplatesForMatter,
  linkFactsToElement,
} from "@/lib/legal-element-templates";
import { STRATEGY_STATUS_OPTIONS, isStrategyStatus } from "@/lib/matter-status";
import type { DocumentRow, LegalElementRow, Matter } from "@/lib/types";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

const inputClass = "w-full rounded border border-slate-200 px-2 py-1 text-sm";

export function LegalElementsPanel({
  matter,
  documents,
  elements,
  onElementsChange,
  onRefresh,
}: {
  matter: Matter;
  documents: DocumentRow[];
  elements: LegalElementRow[];
  onElementsChange: (rows: LegalElementRow[]) => void;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newElementName, setNewElementName] = useState("");
  const [fetchedPayload, setFetchedPayload] = useState<AssessmentOcrPayload | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [fetchedDocId, setFetchedDocId] = useState<string | null>(null);

  const templates = useMemo(
    () => legalElementTemplatesForMatter(matter.caseType),
    [matter.caseType],
  );
  const assessmentDoc = useMemo(() => findCaseAssessmentDocument(documents), [documents]);
  const payload = assessmentDoc ? fetchedPayload : null;
  const facts = useMemo(() => normalizeExtractedFacts(payload?.facts), [payload]);

  if (assessmentDoc?.id !== fetchedDocId) {
    setFetchedDocId(assessmentDoc?.id ?? null);
    if (!assessmentDoc) setFetchedPayload(null);
  }

  useEffect(() => {
    if (!assessmentDoc) return;
    void fetch(`/api/matters/${matter.matterId}/case-assessment-document`)
      .then((r) => r.json())
      .then((data: { payload?: AssessmentOcrPayload | null; note?: { content?: string } }) => {
        if (data.payload) setFetchedPayload(data.payload);
        else if (data.note?.content) setFetchedPayload(parseAssessmentOcrPayload(data.note.content));
        else setFetchedPayload(null);
      })
      .catch(() => setFetchedPayload(null));
  }, [matter.matterId, assessmentDoc?.id]);

  async function saveElement(row: LegalElementRow) {
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (resp.ok) {
      const { row: updated } = (await resp.json()) as { row: LegalElementRow };
      onElementsChange(elements.map((r) => (r.id === updated.id ? updated : r)));
    }
  }

  async function addElement(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elementName: trimmed }),
    });
    if (resp.ok) {
      const { row } = (await resp.json()) as { row: LegalElementRow };
      onElementsChange([...elements, row]);
      setNewElementName("");
    }
  }

  async function seedFromTemplates() {
    setSeeding(true);
    try {
      const existing = new Set(elements.map((e) => e.element.toLowerCase()));
      for (const template of templates) {
        if (existing.has(template.name.toLowerCase())) continue;
        const linked = linkFactsToElement(template, facts);
        const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elementName: template.name }),
        });
        if (resp.ok) {
          const { row } = (await resp.json()) as { row: LegalElementRow };
          const patch: LegalElementRow = {
            ...row,
            assessment: linked.some((f) => f.verified) ? "Met" : linked.length ? "Partial" : "Gap",
            supportingFacts: formatLinkedFacts(linked) || row.supportingFacts,
            keyGap: linked.length ? "" : "No extracted facts linked yet",
          };
          await saveElement(patch);
          existing.add(template.name.toLowerCase());
        }
      }
      onRefresh();
    } finally {
      setSeeding(false);
    }
  }

  function templateForElement(name: string) {
    return templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="min-w-[12rem] flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal elements</p>
          <p className="text-xs text-slate-600">
            Map practice-area elements to extracted facts · strategy status per element
          </p>
        </div>
        <button
          type="button"
          className={`${btnSecondary} text-xs`}
          disabled={seeding}
          onClick={() => void seedFromTemplates()}
        >
          <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {seeding ? "Seeding…" : "Load practice-area elements"}
        </button>
        <Link href="/templates#firm-memory" className={`${btnSecondary} text-xs`}>
          <BookOpen className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Firm Memory / reference
        </Link>
      </div>

      {payload?.facts?.length ? (
        <details className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            Extracted facts review (feeds element mapping)
          </summary>
          <div className="mt-3">
            <ExtractedFactsReview
              matterId={matter.matterId}
              payload={payload}
              caseType={matter.caseType}
              practiceArea={matterPracticeArea(matter)}
              deliverableId={payload?.deliverableId ?? "aos-discretionary-brief"}
              onSaved={onRefresh}
            />
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add element</span>
          <input
            className="mt-1 rounded border border-slate-200 px-2 py-1.5"
            value={newElementName}
            onChange={(e) => setNewElementName(e.target.value)}
            placeholder="e.g. Extreme hardship to qualifying relative"
          />
        </label>
        <button type="button" className={btnPrimary} onClick={() => void addElement(newElementName)}>
          <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Add
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Element</th>
              <th className="px-3 py-2">Strategy</th>
              <th className="px-3 py-2">Key gap</th>
              <th className="px-3 py-2">Next action</th>
              <th className="px-3 py-2 w-20">Details</th>
            </tr>
          </thead>
          <tbody>
            {elements.length ? (
              elements.map((row) => {
                const template = templateForElement(row.element);
                const linked = template ? linkFactsToElement(template, facts) : [];
                const refHref = firmMemoryReferenceHref(template?.referenceSlug);
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.element}</p>
                        {template?.feedsSection ? (
                          <p className="text-xs text-slate-500">→ {template.feedsSection}</p>
                        ) : null}
                        {refHref ? (
                          <a href={refHref} className="text-xs text-sky-700 hover:underline">
                            Immigration reference →
                          </a>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={inputClass}
                          value={isStrategyStatus(row.assessment) ? row.assessment : ""}
                          onChange={(e) => {
                            const next = { ...row, assessment: e.target.value };
                            onElementsChange(elements.map((r) => (r.id === row.id ? next : r)));
                            void saveElement(next);
                          }}
                        >
                          <option value="">—</option>
                          {STRATEGY_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={inputClass}
                          value={row.keyGap}
                          onChange={(e) =>
                            onElementsChange(
                              elements.map((r) => (r.id === row.id ? { ...r, keyGap: e.target.value } : r)),
                            )
                          }
                          onBlur={() => void saveElement(row)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={inputClass}
                          value={row.nextAction}
                          onChange={(e) =>
                            onElementsChange(
                              elements.map((r) => (r.id === row.id ? { ...r, nextAction: e.target.value } : r)),
                            )
                          }
                          onBlur={() => void saveElement(row)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-sky-700 hover:underline"
                          onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                        >
                          {expandedId === row.id ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === row.id ? (
                      <tr className="border-t border-slate-50 bg-slate-50/50">
                        <td colSpan={5} className="space-y-2 px-3 py-3 text-xs text-slate-700">
                          <p>
                            <span className="font-semibold">How facts meet this element: </span>
                            {linked.length
                              ? linked
                                  .map((f) => {
                                    const fit = f.elementFit ? ` — ${f.elementFit}` : "";
                                    return `${factDisplayLabel(f)}: ${formatLinkedFacts([f])}${fit}`;
                                  })
                                  .join(" · ")
                              : row.supportingFacts?.trim() ||
                                "None linked — upload assessment or run Re-analyze with AI."}
                          </p>
                          <label className="block">
                            <span className="font-semibold">Supporting facts (editable)</span>
                            <textarea
                              className={`${inputClass} mt-1 min-h-[4rem]`}
                              value={row.supportingFacts ?? ""}
                              onChange={(e) =>
                                onElementsChange(
                                  elements.map((r) =>
                                    r.id === row.id ? { ...r, supportingFacts: e.target.value } : r,
                                  ),
                                )
                              }
                              onBlur={() => void saveElement(row)}
                            />
                          </label>
                          <p>
                            <span className="font-semibold">Supporting cases: </span>
                            {row.supportingCases?.trim() || "None recorded."}
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={ClipboardList}
                    title="No legal elements yet."
                    description='Click "Load practice-area elements" or add elements manually.'
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
