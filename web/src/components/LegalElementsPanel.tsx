"use client";

import { BookOpen, Library, Map, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

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
  coreFirmKnowledgeElementsForMatter,
  encodeFirmKnowledgeSource,
  firmKnowledgeBrowseHref,
  firmKnowledgeElementsForMatter,
  firmKnowledgeTopicHref,
  formatMissingFactsSummary,
  formatNeededFactsChecklist,
  missingCoreFirmKnowledgeElements,
  missingOptionalFirmKnowledgeElements,
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
  const [caseTypePrompt, setCaseTypePrompt] = useState<{
    missing: FirmKnowledgeElement[];
  } | null>(null);

  const autoSeededForMatter = useRef<string | null>(null);
  const lastCaseType = useRef<string>(matter.caseType ?? "");
  const elementsRef = useRef(elements);
  // Keep a ref mirror for the case-type-change effect below without adding
  // `elements` (which changes on every save) to that effect's deps — mutate it
  // in an effect rather than during render.
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const coreElements = useMemo(
    () => coreFirmKnowledgeElementsForMatter(matter.caseType),
    [matter.caseType],
  );
  const knowledgeLookup = useMemo(
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
  const missingCore = useMemo(
    () => missingCoreFirmKnowledgeElements(matter.caseType, elements),
    [matter.caseType, elements],
  );
  const optionalAvailable = useMemo(
    () => missingOptionalFirmKnowledgeElements(matter.caseType, elements),
    [matter.caseType, elements],
  );

  useEffect(() => {
    if (!assessmentDocId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale payload when the assessment document is removed
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
    currentFacts: ReturnType<typeof normalizeExtractedFacts>,
  ): Promise<LegalElementRow | null> {
    if (existingNames.has(knowledge.name.toLowerCase())) return null;
    const statuses = scoreNeededFacts(knowledge.neededFacts, currentFacts);
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

  async function seedCoreElements(
    mode: "empty" | "merge",
    knowledgeList?: FirmKnowledgeElement[],
  ) {
    setSeeding(true);
    try {
      const current = elementsRef.current;
      const toAdd =
        knowledgeList ??
        (mode === "merge"
          ? missingCoreFirmKnowledgeElements(matter.caseType, current)
          : coreFirmKnowledgeElementsForMatter(matter.caseType));
      const existingNames = new Set(current.map((e) => e.element.toLowerCase()));
      for (const e of current) {
        const tid = parseFirmKnowledgeTopicId(e.supportingCases);
        if (tid) existingNames.add(tid);
      }
      const nextRows: LegalElementRow[] = [...current];
      for (const knowledge of toAdd) {
        const row = await createFromKnowledge(knowledge, existingNames, facts);
        if (row) nextRows.push(row);
      }
      // Fallback: practice-area templates when knowledge map empty for this type.
      if (!toAdd.length && mode === "empty" && !nextRows.length) {
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
      setCaseTypePrompt(null);
    } finally {
      setSeeding(false);
    }
  }

  async function addOptionalKnowledge(topicId: string) {
    const knowledge = optionalAvailable.find((o) => o.topicId === topicId);
    if (!knowledge || seeding) return;
    setSeeding(true);
    try {
      const current = elementsRef.current;
      const existingNames = new Set(current.map((e) => e.element.toLowerCase()));
      for (const e of current) {
        const tid = parseFirmKnowledgeTopicId(e.supportingCases);
        if (tid) existingNames.add(tid);
      }
      const row = await createFromKnowledge(knowledge, existingNames, facts);
      if (row) {
        onElementsChange([...current, row]);
        onRefresh();
      }
    } finally {
      setSeeding(false);
    }
  }

  // Auto-seed core elements when the matter opens empty (do not wipe customized lists).
  useEffect(() => {
    const key = `${matter.matterId}::${matter.caseType || ""}`;
    if (autoSeededForMatter.current === key) return;
    if (elements.length > 0) {
      autoSeededForMatter.current = key;
      return;
    }
    if (!matter.caseType?.trim() && !coreElements.length) {
      autoSeededForMatter.current = key;
      return;
    }
    autoSeededForMatter.current = key;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time seed of core elements when a matter opens empty
    void seedCoreElements("empty");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per matter/caseType when empty
  }, [matter.matterId, matter.caseType, elements.length]);

  // Case type change: offer merge of missing core (never destroy custom).
  useEffect(() => {
    const prev = lastCaseType.current;
    const next = matter.caseType ?? "";
    if (prev === next) return;
    lastCaseType.current = next;
    if (!prev || !next || elementsRef.current.length === 0) return;
    const missing = missingCoreFirmKnowledgeElements(next, elementsRef.current);
    if (missing.length) setCaseTypePrompt({ missing });
    else setCaseTypePrompt(null);
  }, [matter.caseType]);

  function knowledgeForRow(row: LegalElementRow): FirmKnowledgeElement | undefined {
    const topicId = parseFirmKnowledgeTopicId(row.supportingCases);
    if (topicId) return knowledgeLookup.find((k) => k.topicId === topicId);
    return knowledgeLookup.find((k) => k.name.toLowerCase() === row.element.toLowerCase());
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
              Core elements auto-load for this matter type from Firm Knowledge. Add optional topics or
              customize below — your edits are kept.
            </p>
            {coreElements.length ? (
              <p className="mt-1 text-[11px] text-slate-600">
                {matter.caseType || "This matter"}: {coreElements.length} core
                {optionalAvailable.length ? ` · ${optionalAvailable.length} optional available` : ""}
                {seeding ? " · updating…" : ""}
              </p>
            ) : null}
          </div>
          {optionalAvailable.length ? (
            <label className="flex flex-col text-xs">
              <span className="font-semibold uppercase tracking-wide text-slate-500">
                Add optional element…
              </span>
              <select
                className="mt-1 min-w-[14rem] rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
                disabled={seeding}
                defaultValue=""
                key={optionalAvailable.map((o) => o.topicId).join(",")}
                onChange={(e) => {
                  const id = e.target.value;
                  e.target.value = "";
                  if (id) void addOptionalKnowledge(id);
                }}
              >
                <option value="">Choose…</option>
                {optionalAvailable.map((o) => (
                  <option key={o.topicId} value={o.topicId}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {caseTypePrompt?.missing.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200">
            <span>
              Case type updated — {caseTypePrompt.missing.length} core element
              {caseTypePrompt.missing.length === 1 ? "" : "s"} missing. Add them without removing your
              edits?
            </span>
            <button
              type="button"
              className={`${btnPrimary} text-xs`}
              disabled={seeding}
              onClick={() => void seedCoreElements("merge", caseTypePrompt.missing)}
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {seeding ? "Adding…" : "Add missing core"}
            </button>
            <button
              type="button"
              className={`${btnSecondary} text-xs`}
              onClick={() => setCaseTypePrompt(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {!caseTypePrompt && elements.length > 0 && missingCore.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              className={`${btnSecondary} text-xs`}
              disabled={seeding}
              onClick={() => void seedCoreElements("merge")}
              title="Add missing core firm-knowledge elements without removing your edits"
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {seeding ? "Adding…" : `Add ${missingCore.length} missing core`}
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
          <Link href={browseHref as "/knowledge-map"} className={`${btnSecondary} text-xs`}>
            <Map className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Browse knowledge for this matter type
          </Link>
          <Link href="/firm-memory" className={`${btnSecondary} text-xs`}>
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
            <dd>Tone, voice samples, and style prefs — not element checklists.</dd>
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
            Add custom element
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
                    title={seeding ? "Loading legal elements…" : "No legal elements yet."}
                    description={
                      seeding
                        ? "Auto-loading core Firm Knowledge for this matter type."
                        : "Set a case type on the matter to auto-load core elements, or add a custom element above."
                    }
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
