"use client";

import Link from "next/link";
import { FileText, Sparkles, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { AssessmentOcrPayload } from "@/lib/assessment-documents";
import type { DraftingFactsPayload } from "@/lib/practice-area-facts";

type FirmMemoryStatus = {
  configured: boolean;
  templateCount: number;
  sampleCount: number;
};

type Props = {
  matterId: string;
  caseType: string;
  deliverableId?: string;
  onApplyAssessmentFacts?: (facts: Array<{ fact_type: string; value: string }>, ocrText?: string) => void;
  onApplySavedFacts?: (facts: DraftingFactsPayload) => void;
};

/** Context-aware intake sidebar when a matter is linked (Phase 2). */
export function IntakeContextSidebar({
  matterId,
  caseType,
  deliverableId,
  onApplyAssessmentFacts,
  onApplySavedFacts,
}: Props) {
  const [firmMemory, setFirmMemory] = useState<FirmMemoryStatus | null>(null);
  const [assessmentOnFile, setAssessmentOnFile] = useState(false);
  const [assessmentPreview, setAssessmentPreview] = useState<string | null>(null);
  const [savedFactsLoaded, setSavedFactsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!matterId) return;
    const applyKey = `${matterId}::${deliverableId ?? ""}`;
    if (appliedRef.current === applyKey) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [fmRes, assessRes, factsRes] = await Promise.all([
          fetch("/api/firm-memory").then((r) => r.json()).catch(() => null),
          fetch(`/api/matters/${matterId}/case-assessment-document`)
            .then((r) => r.json())
            .catch(() => ({ payload: null })),
          fetch(`/api/matters/${matterId}/drafting-facts`)
            .then((r) => r.json())
            .catch(() => ({ facts: null })),
        ]);

        if (cancelled) return;

        if (fmRes) setFirmMemory(fmRes as FirmMemoryStatus);

        const payload = assessRes?.payload as AssessmentOcrPayload | null;
        if (payload?.v === 1) {
          setAssessmentOnFile(true);
          setAssessmentPreview(payload.ocrText?.slice(0, 120) ?? null);
          if (payload.facts?.length && onApplyAssessmentFacts) {
            onApplyAssessmentFacts(payload.facts, payload.ocrText);
          }
        }

        if (factsRes?.facts && onApplySavedFacts) {
          onApplySavedFacts(factsRes.facts as DraftingFactsPayload);
          setSavedFactsLoaded(true);
        }

        appliedRef.current = applyKey;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [matterId, deliverableId, onApplyAssessmentFacts, onApplySavedFacts]);

  if (!matterId) return null;

  return (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <h2 className="text-sm font-semibold text-slate-900">Matter context</h2>
      <p className="text-xs text-slate-500">
        Linked to <span className="font-medium text-slate-800">{matterId}</span> · {caseType}
      </p>

      {loading ? (
        <p className="text-xs text-slate-500">Loading matter hints…</p>
      ) : (
        <ul className="space-y-3 text-sm">
          <li className="flex gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">Case assessment</p>
              {assessmentOnFile ? (
                <>
                  <p className="text-xs text-emerald-800">Assessment on file — OCR feeds drafts</p>
                  {assessmentPreview ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{assessmentPreview}…</p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-amber-900">
                  No assessment scan yet.{" "}
                  <Link href={`/matters/${matterId}`} className="font-medium underline-offset-2 hover:underline">
                    Upload on Documents tab →
                  </Link>
                </p>
              )}
            </div>
          </li>

          <li className="flex gap-2">
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">Saved facts</p>
              <p className="text-xs text-slate-600">
                {savedFactsLoaded
                  ? "Prefilled from matter checklist — edit below before submit."
                  : "No saved checklist on this matter yet."}
              </p>
            </div>
          </li>

          <li className="flex gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">Firm Memory</p>
              {firmMemory?.configured ? (
                <p className="text-xs text-emerald-800">
                  Style profile active ({firmMemory.sampleCount} sample
                  {firmMemory.sampleCount === 1 ? "" : "s"}).
                </p>
              ) : (
                <p className="text-xs text-amber-900">
                  <Link href="/templates#firm-memory" className="font-medium underline-offset-2 hover:underline">
                    Set up Firm Memory
                  </Link>{" "}
                  for closer in-house voice.
                </p>
              )}
            </div>
          </li>
        </ul>
      )}
    </aside>
  );
}
