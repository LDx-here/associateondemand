"use client";

import { useEffect, useState } from "react";

import {
  CASE_JOURNEYS,
  JOURNEY_BY_ID,
  journeyPosition,
  proposeCurrentStepId,
  proposeJourneyId,
  type JourneyId,
  type JourneyState,
} from "@/lib/case-journey";

/**
 * The case journey — "this is where we started, this is where we are right
 * now, and based on the template, this is typically the last of the pieces
 * that we'll have to anticipate in preparation."
 *
 * Clicking a step is how she moves the matter. No inference decides her
 * position in a case; posture only supplies the opening guess.
 */
export function CaseJourneyPanel({
  matterId,
  caseType,
  proceduralPosture,
}: {
  matterId: string;
  caseType: string;
  proceduralPosture?: string | null;
}) {
  const [state, setState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/matters/${matterId}/journey`)
      .then((r) => r.json())
      .then((data: { state?: JourneyState | null }) => {
        if (!cancelled) setState(data.state ?? null);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matterId]);

  async function persist(next: JourneyState) {
    setState(next);
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`/api/matters/${matterId}/journey`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      if (!resp.ok) setError("Could not save where this matter stands.");
    } catch {
      setError("Could not save where this matter stands.");
    } finally {
      setSaving(false);
    }
  }

  function startJourney(journeyId: JourneyId) {
    const journey = JOURNEY_BY_ID[journeyId];
    const guess = proposeCurrentStepId(journeyId, proceduralPosture) ?? journey.steps[0].id;
    void persist({
      matterId,
      journeyId,
      currentStepId: guess,
      updatedAt: new Date().toISOString(),
    });
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Loading the case journey…
      </section>
    );
  }

  // Not set yet — offer the journey that matches this case type first.
  if (!state) {
    const suggested = proposeJourneyId(caseType);
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Case journey</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Track this matter against the way its case type usually runs — where it started, where it
          stands, and what typically comes next.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CASE_JOURNEYS.map((journey) => (
            <button
              key={journey.id}
              type="button"
              className={
                journey.id === suggested
                  ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  : "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
              }
              onClick={() => startJourney(journey.id)}
            >
              {journey.title}
              {journey.id === suggested ? " (this case type)" : ""}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const position = journeyPosition(state);
  if (!position) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Case journey</h2>
        <p className="mt-1 text-sm text-slate-600">
          This matter&rsquo;s saved step no longer exists in the template. Pick where it stands:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CASE_JOURNEYS.map((journey) => (
            <button
              key={journey.id}
              type="button"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
              onClick={() => startJourney(journey.id)}
            >
              {journey.title}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const { journey, current, next, stepNumber, totalSteps, awaiting, prepare } = position;
  const currentIndex = journey.steps.findIndex((s) => s.id === current.id);
  // Everything through the next step always shows. The tail collapses so the
  // panel reads as a position in a case, not a checklist of twelve things.
  const visible = showAll ? journey.steps : journey.steps.slice(0, currentIndex + 2);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{journey.title}</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Step {stepNumber} of {totalSteps} ·{" "}
            {awaiting === "them" ? (
              <span className="text-slate-700">the next move is theirs</span>
            ) : (
              <span className="font-medium text-rose-900">the next move is yours</span>
            )}
          </p>
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">
          {saving ? "Saving…" : error ? error : "Click a step to move this matter"}
        </p>
      </div>

      <ol className="mt-4 space-y-0">
        {visible.map((step, i) => {
          const index = journey.steps.findIndex((s) => s.id === step.id);
          const done = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isNext = next ? step.id === next.id : false;
          const last = i === visible.length - 1;

          return (
            <li key={step.id} className="flex gap-3">
              {/* Rail: marker plus the connector to the next step. */}
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={
                    isCurrent
                      ? "mt-1.5 h-3 w-3 shrink-0 rounded-full bg-sky-700 ring-4 ring-sky-100"
                      : done
                        ? "mt-1.5 h-3 w-3 shrink-0 rounded-full bg-slate-700"
                        : "mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300 bg-white"
                  }
                />
                {!last ? (
                  <span
                    aria-hidden
                    className={done ? "w-px flex-1 bg-slate-300" : "w-px flex-1 bg-slate-200"}
                  />
                ) : null}
              </div>

              <div className={last ? "min-w-0 flex-1 pb-1" : "min-w-0 flex-1 pb-4"}>
                <button
                  type="button"
                  className="text-left"
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() =>
                    void persist({ ...state, currentStepId: step.id, updatedAt: new Date().toISOString() })
                  }
                >
                  <span
                    className={
                      isCurrent
                        ? "text-sm font-semibold text-slate-900"
                        : done
                          ? "text-sm text-slate-600"
                          : "text-sm text-slate-500 hover:text-slate-800"
                    }
                  >
                    {step.label}
                  </span>
                  {isCurrent ? (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-sky-900">
                      Now
                    </span>
                  ) : null}
                  {index === 0 && !isCurrent ? (
                    <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
                      Started here
                    </span>
                  ) : null}
                </button>

                {isCurrent && step.detail ? (
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">{step.detail}</p>
                ) : null}

                {/* The "anticipate in preparation" list — shown on the current
                    step and the one after it, where it is still actionable. */}
                {isCurrent || isNext ? (
                  step.prepare && step.prepare.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {step.prepare.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-slate-700">
                          <span aria-hidden className="text-slate-400">
                            ·
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {journey.steps.length > visible.length ? (
        <button
          type="button"
          className="mt-1 text-sm text-sky-800 underline-offset-2 hover:underline"
          onClick={() => setShowAll(true)}
        >
          Show the rest of the journey ({journey.steps.length - visible.length} more)
        </button>
      ) : null}
      {showAll && journey.steps.length > currentIndex + 2 ? (
        <button
          type="button"
          className="mt-1 text-sm text-slate-500 underline-offset-2 hover:underline"
          onClick={() => setShowAll(false)}
        >
          Collapse
        </button>
      ) : null}

      {prepare.length > 0 ? (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {prepare.length} item{prepare.length === 1 ? "" : "s"} to have ready through{" "}
          {next ? next.label.toLowerCase() : "the end of this matter"}.
        </p>
      ) : null}
    </section>
  );
}
