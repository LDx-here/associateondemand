"use client";

import { BookOpen, Library, Map, Plus, RefreshCw, Sparkles } from "lucide-react";
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
  encodeFirmKnowledgeSource,
  firmKnowledgeBrowseHref,
  firmKnowledgeElementsForMatter,
  firmKnowledgeTopicHref,
  formatMissingFactsSummary,
  formatNeededFactsChecklist,
  missingFirmKnowledgeElements,
  parseFirmKnowledgeTopicId,
  scoreNeededFacts,
  type FirmKnowledgeElement,
} from "@/lib/firm-knowledge-for-matter";
import {
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
  const [seedMode, setSeedMode] = useState<"load" | "merge" | null>(null);

  const knowledgeElements = useMemo(
    () => firmKnowledgeElementsForMatter(matter.caseType),
    [matter.caseType],
  );
  const templates = useMemo(
    () => legalElementTemplatesForMatter(matter.caseType),
    [matter.caseType],
  );
  const browseHref = useMemo(() => firmKnowledgeBrowseHref(matter.caseType), [matter.caseType]);
  const assessmentDoc = useMemo(() => findCaseAssessmentDocument(documents), [documents]);
  const assessmentDocId = assessmentDoc?.id ?? null;
  const payload = assessmentDoc ? fetchedPayload : null;
  const facts = useMemo(() => normalizeExtractedFacts(payload?.facts), [payload]);
  const missingCount = useMemo(
    () => missingFirmKnowledgeElements(matter.caseType, elements).length,
    [matter.caseType, elements],
  );

  useEffect(() => {
    if (!assessmentDocId) {
      setFetchedPayload(null);
      return;
    }
    void fetch(`/api/matters/${matter.matterId}/case-assessment-document`)
      .then((r) => r.json())
      .then((data: { payload?: AssessmentOcrPayload | null; note?: { content?: string } }) => {
        if (data.payload) setFetchedPayload(data.payload);
        else if (data.note?.content) setFetchedPayload(parseAssessmentOcrPayload(data.note.content));
        else setFetchedPayload(null);
      })
      .catch(() => setFetchedPayload(null));
  }, [matter.matterId, assessmentDocId]);

  async function saveElement(row: LegalElementRow) {
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (resp.ok) {
      const { row: updated } = (await resp.json()) as { row: LegalElementRow };
      onElementsChange(elements.map((r) => (r.id === updated.id ? updated : r)));
      return updated;
    }
    return null;
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

  async function patchElement(row: LegalElementRow): Promise<LegalElementRow | null> {
    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!resp.ok) return null;
    const { row: updated } = (await resp.json()) as { row: LegalElementRow };
    return updated;
  }

  async function createFromKnowledge(
    knowledge: FirmKnowledgeElement,
    existingNames: Set<string>,
  ): Promise<LegalElementRow | null> {
    if (existingNames.has(knowledge.name.toLowerCase())) return null;
    const statuses = scoreNeededFacts(knowledge.neededFacts, facts);
    const checklist = formatNeededFactsChecklist(statuses);
    const gap = formatMissingFactsSummary(statuses);
    const presentCount = statuses.filter((s) => s.status === "present").length;
    const assessment =
      statuses.length === 0
        ? "Gap"
        : presentCount === 0
          ? "Gap"
          : presentCount === statuses.length
            ? "Met"
            : "Partial";

    const resp = await fetch(`/api/matters/${matter.matterId}/legal-elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elementName: knowledge.name }),
    });
    if (!resp.ok) return null;
    const { row } = (await resp.json()) as { row: LegalElementRow };
    const patch: LegalElementRow = {
      ...row,
      assessment,
      supportingCases: encodeFirmKnowledgeSource(knowledge.topicId, knowledge.cite),
      supportingFacts: checklist
        ? `Needed facts (from firm knowledge):\n${checklist}`
        : knowledge.description || row.supportingFacts,
      keyGap: gap || (checklist ? "" : "No extracted facts linked yet — upload case assessment"),
      nextAction: statuses.some((s) => s.status === "needed")
        ? "Gather missing facts that prove this element"
        : "Confirm evidence package for this element",
    };
    const saved = (await patchElement(patch)) ?? patch;
    existingNames.add(knowledge.name.toLowerCase());
    return saved;
  }

  async function seedFromFirmKnowledge(mode: "load" | "merge") {
    setSeeding(true);
    setSeedMode(mode);
    try {
      const toAdd =
        mode === "merge"
          ? missingFirmKnowledgeElements(matter.caseType, elements)
          : firmKnowledgeElementsForMatter(matter.caseType);
      const existingNames = new Set(elements.map((e) => e.element.toLowerCase()));
      if (mode === "merge") {
        for (const e of elements) {
          const tid = parseFirmKnowledgeTopicId(e.supportingCases);
          if (tid) existingNames.add(tid);
        }
      }
      const nextRows: LegalElementRow[] = [...elements];
      for (const knowledge of toAdd) {
        const row = await createFromKnowledge(knowledge, existingNames);
        if (row) nextRows.push(row);
      }
      // Fallback: if knowledge map empty for non-immigration, use practice-area templates.
      if (!toAdd.length && mode === "load") {
        for (const template of templates) {
          if (existingNames.has(template.name.toLowerCase())) continue;
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
            const saved = (await patchElement(patch)) ?? patch;
            nextRows.push(saved);
            existingNames.add(template.name.toLowerCase());
          }
        }
      }
      onElementsChange(nextRows);
      onRefresh();
    } finally {
      setSeeding(false);
      setSeedMode(null);
    }
  }

  function knowledgeForRow(row: LegalElementRow): FirmKnowledgeElement | undefined {
    const topicId = parseFirmKnowledgeTopicId(row.supportingCases);
    if (topicId) return knowledgeElements.find((k) => k.topicId === topicId);
    return knowledgeElements.find((k) => k.name.toLowerCase() === row.element.toLowerCase());
  }

  function templateForElement(name: string) {
    return templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Legal elements
            </p>
            <p className="text-xs text-slate-600">
              Load from Firm Knowledge for this matter type · customize · agents use the same map in
              drafts
            </p>
            {knowledgeElements.length ? (
              <p className="mt-1 text-[11px] text-violet-800">
                Suggested for {matter.caseType || "this matter"}: {knowledgeElements.length} knowledge
                topics
                {elements.length ? ` · ${missingCount} not yet on matter` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={`${btnPrimary} text-xs`}
            disabled={seeding}
            onClick={() => void seedFromFirmKnowledge("load")}
            title="Prefill Legal Elements from the knowledge map for this matter type"
          >
            <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {seeding && seedMode === "load"
              ? "Loading…"
              : "Load elements for this matter type"}
          </button>
          {elements.length && missingCount > 0 ? (
            <button
              type="button"
              className={`${btnSecondary} text-xs`}
              disabled={seeding}
              onClick={() => void seedFromFirmKnowledge("merge")}
              title="Add missing firm-knowledge elements without removing your edits"
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {seeding && seedMode === "merge" ? "Merging…" : "Re-suggest (keep edits)"}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
          <Link href={browseHref as "/knowledge-map"} className={`${btnSecondary} text-xs`}>
            <Map className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Browse knowledge for this matter type
          </Link>
          <Link href="/templates#firm-memory" className={`${btnSecondary} text-xs`}>
            <BookOpen className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Firm Memory (voice / style)
          </Link>
          <Link href="/knowledge-map#firm-knowledge" className={`${btnSecondary} text-xs`}>
            <Library className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            All Firm Knowledge
          </Link>
        </div>

        <dl className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
          <div className="rounded-md bg-violet-50/80 px-2 py-1.5 ring-1 ring-violet-100">
            <dt className="font-semibold text-violet-950">Firm Knowledge</dt>
            <dd>Book-extracted legal elements (this tab + agent prompts).</dd>
          </div>
          <div className="rounded-md bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
            <dt className="font-semibold text-slate-800">Firm Memory</dt>
            <dd>Tone, voice samples, and style prefs on Templates — not element checklists.</dd>
          </div>
        </dl>
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
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Add / customize element
          </span>
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
                const knowledge = knowledgeForRow(row);
                const template = templateForElement(row.element);
                const linked = template ? linkFactsToElement(template, facts) : [];
                const topicId =
                  parseFirmKnowledgeTopicId(row.supportingCases) ?? knowledge?.topicId ?? null;
                const needed = knowledge
                  ? scoreNeededFacts(knowledge.neededFacts, facts, row.supportingFacts)
                  : [];
                const neededPresent = needed.filter((n) => n.status === "present").length;
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.element}</p>
                        {topicId ? (
                          <p className="mt-0.5 text-[11px] text-violet-800">
                            From firm knowledge:{" "}
                            <a
                              href={firmKnowledgeTopicHref(topicId)}
                              className="font-medium underline-offset-2 hover:underline"
                            >
                              {topicId}
                            </a>
                          </p>
                        ) : template?.feedsSection ? (
                          <p className="text-xs text-slate-500">→ {template.feedsSection}</p>
                        ) : null}
                        {needed.length ? (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Facts: {neededPresent}/{needed.length} present
                          </p>
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
                              elements.map((r) =>
                                r.id === row.id ? { ...r, nextAction: e.target.value } : r,
                              ),
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
                        <td colSpan={5} className="space-y-3 px-3 py-3 text-xs text-slate-700">
                          {knowledge?.cite ? (
                            <p>
                              <span className="font-semibold">Cite: </span>
                              {knowledge.cite}
                            </p>
                          ) : row.supportingCases?.trim() ? (
                            <p>
                              <span className="font-semibold">Source / cases: </span>
                              {row.supportingCases}
                            </p>
                          ) : null}

                          {needed.length ? (
                            <div>
                              <p className="font-semibold">Information needed (facts that prove it)</p>
                              <ul className="mt-1.5 space-y-1">
                                {needed.map((n) => (
                                  <li
                                    key={n.fact}
                                    className={
                                      n.status === "present"
                                        ? "rounded bg-emerald-50 px-2 py-1 text-emerald-900 ring-1 ring-emerald-100"
                                        : "rounded bg-amber-50 px-2 py-1 text-amber-950 ring-1 ring-amber-100"
                                    }
                                  >
                                    <span className="font-medium">
                                      {n.status === "present" ? "Present" : "Needed"}
                                    </span>
                                    {" — "}
                                    {n.fact}
                                    {n.matchedFrom ? (
                                      <span className="text-emerald-800"> · matched {n.matchedFrom}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

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
                    icon={Library}
                    title="No legal elements yet."
                    description='Click "Load elements for this matter type" to pull Firm Knowledge topics (e.g. family AOS → hardship, affidavit of support), then customize.'
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
