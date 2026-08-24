"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ANCHOR_BY_ID,
  FIVE_ANCHORS,
  answerKey,
  anchorProgress,
  emptyAnchorIntake,
  intakeReadiness,
  unansweredAnchors,
  type AnchorIntake,
} from "@/lib/five-anchors";

const AUTOSAVE_MS = 900;

/**
 * The Five Anchors — the intake the blueprint says every matter runs through.
 *
 * Manual by design. Every question here is answerable by typing, today, with
 * no model in the loop: "intuitively prepared, manual, and then we will one
 * day add the ai intuitiveness." When extraction arrives it fills these same
 * boxes and she corrects rather than composes — the screen does not change.
 *
 * Saves on its own. Reconstructing a case is friction enough without a Save
 * button to remember.
 */
export function MatterAnchorsPanel({ matterId }: { matterId: string }) {
  const [intake, setIntake] = useState<AnchorIntake | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<number | null>(null);
  // Held in a ref so the debounced save always writes the latest answers,
  // not the ones captured when the timer was set.
  const pendingRef = useRef<AnchorIntake | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/matters/${matterId}/anchors`)
      .then((r) => r.json())
      .then((data: { intake?: AnchorIntake | null }) => {
        if (cancelled) return;
        setIntake(data.intake ?? emptyAnchorIntake(matterId));
      })
      .catch(() => {
        if (!cancelled) setIntake(emptyAnchorIntake(matterId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  const flush = useCallback(async () => {
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;
    setSaveState("saving");
    try {
      const resp = await fetch(`/api/matters/${matterId}/anchors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: next }),
      });
      setSaveState(resp.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, [matterId]);

  // Don't lose the last keystrokes when she navigates away mid-edit.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      void flush();
    };
  }, [flush]);

  function setAnswer(key: string, value: string) {
    setIntake((current) => {
      const base = current ?? emptyAnchorIntake(matterId);
      const next: AnchorIntake = {
        ...base,
        answers: { ...base.answers, [key]: value },
        updatedAt: new Date().toISOString(),
      };
      pendingRef.current = next;
      return next;
    });
    setSaveState("idle");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Loading the case anchors…
      </section>
    );
  }

  const current = intake ?? emptyAnchorIntake(matterId);
  const progress = anchorProgress(current);
  const readiness = intakeReadiness(current);
  const missing = unansweredAnchors(current);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Case anchors</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Five questions every matter runs through, so picking this case back up doesn&rsquo;t
              mean reconstructing it. Answer what you know — blanks are the point, not a failure.
            </p>
          </div>
          <p className="text-xs text-slate-500" aria-live="polite">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Could not save — your text is still here; try again."
                  : "Saves as you type"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {progress.map((p) => {
            const anchor = ANCHOR_BY_ID[p.anchorId];
            const started = p.answered > 0;
            return (
              <span
                key={p.anchorId}
                className={
                  started
                    ? "rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500"
                }
              >
                {anchor.title} {p.answered}/{p.total}
              </span>
            );
          })}
        </div>

        {/* The fifth anchor gets its own callout. A case that looks complete
            but never said what it doesn't know is the thing to catch. */}
        {!readiness.gapsAddressed ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Uncertainty and gaps is still empty. Even one line — what you&rsquo;re assuming, or what
            you still need — is what keeps this from reading as more settled than it is.
          </p>
        ) : null}

        {missing.length > 0 && readiness.gapsAddressed ? (
          <p className="mt-3 text-sm text-slate-600">
            Not yet addressed: {missing.map((id) => ANCHOR_BY_ID[id].title).join(", ")}.
          </p>
        ) : null}
      </div>

      {FIVE_ANCHORS.map((anchor) => {
        const isGaps = anchor.id === "gaps";
        return (
          <div
            key={anchor.id}
            className={
              isGaps
                ? "rounded-lg border border-amber-200 bg-amber-50/40 p-5 shadow-sm"
                : "rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            }
          >
            <h3 className="text-base font-semibold text-slate-900">{anchor.title}</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{anchor.captures}</p>

            <div className="mt-4 space-y-4">
              {anchor.prompts.map((prompt) => {
                const key = answerKey(anchor.id, prompt.id);
                const id = `anchor-${anchor.id}-${prompt.id}`;
                return (
                  <div key={prompt.id}>
                    <label htmlFor={id} className="text-sm font-medium text-slate-800">
                      {prompt.question}
                    </label>
                    {prompt.hint ? (
                      <p className="text-xs text-slate-500">{prompt.hint}</p>
                    ) : null}
                    <textarea
                      id={id}
                      className="mt-1.5 min-h-16 w-full rounded-md border border-slate-300 bg-white p-2 text-sm leading-relaxed"
                      value={current.answers[key] ?? ""}
                      onChange={(e) => setAnswer(key, e.target.value)}
                      onBlur={() => {
                        if (timerRef.current) window.clearTimeout(timerRef.current);
                        void flush();
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
