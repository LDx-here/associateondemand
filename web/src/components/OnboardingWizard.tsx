"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  advanceOnboardingStep,
  dismissWizard,
  goToOnboardingStep,
  ONBOARDING_STEP_META,
  ONBOARDING_STEP_ORDER,
  onboardingProgress,
  readOnboardingState,
  shouldShowWizard,
  writeOnboardingState,
  type OnboardingState,
  type OnboardingStepId,
} from "@/lib/onboarding-state";
import { btnPrimary, btnSecondary } from "@/lib/ui-classes";

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    const initial = readOnboardingState();
    setState(initial);
    setOpen(shouldShowWizard(initial));
  }, []);

  const persist = useCallback((next: OnboardingState) => {
    writeOnboardingState(next);
    setState(next);
    if (!shouldShowWizard(next)) setOpen(false);
  }, []);

  if (!state) return null;

  const progress = onboardingProgress(state);
  const meta = ONBOARDING_STEP_META[state.currentStep];

  function handleNext() {
    persist(advanceOnboardingStep(state!));
  }

  function handleDismiss() {
    persist(dismissWizard(state!));
  }

  function handleStepClick(step: OnboardingStepId) {
    persist(goToOnboardingStep(state!, step));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Dismiss onboarding wizard"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Step {progress.step} of {progress.total}
            </span>
          </div>
          <h2 id="onboarding-wizard-title" className="mt-2 text-lg font-semibold text-slate-900">
            {meta.title}
          </h2>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-600 transition-all"
              style={{ width: `${Math.max(progress.percent, (progress.step / progress.total) * 100)}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-700">{meta.detail}</p>

          <ol className="mt-4 flex flex-wrap gap-2">
            {ONBOARDING_STEP_ORDER.map((step) => {
              const done = state.completedSteps.includes(step);
              const active = state.currentStep === step;
              return (
                <li key={step}>
                  <button
                    type="button"
                    onClick={() => handleStepClick(step)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                      active
                        ? "bg-sky-50 text-sky-900 ring-sky-200"
                        : done
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" aria-hidden /> : null}
                    {ONBOARDING_STEP_META[step].title.split(" — ")[0].split(" ")[0]}
                  </button>
                </li>
              );
            })}
          </ol>

          {meta.href && meta.cta ? (
            <Link
              href={meta.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-800 hover:underline"
              onClick={() => persist(markStepOnNavigate(state, state.currentStep))}
            >
              {meta.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className={btnSecondary} onClick={handleDismiss}>
            Skip for now
          </button>
          <div className="flex gap-2">
            {stepIndex(state.currentStep) > 0 ? (
              <button
                type="button"
                className={btnSecondary}
                onClick={() =>
                  persist(
                    goToOnboardingStep(
                      state,
                      ONBOARDING_STEP_ORDER[stepIndex(state.currentStep) - 1]!,
                    ),
                  )
                }
              >
                Back
              </button>
            ) : null}
            <button type="button" className={`${btnPrimary} px-4 py-2`} onClick={handleNext}>
              {state.currentStep === "review" ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function stepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

function markStepOnNavigate(state: OnboardingState, step: OnboardingStepId): OnboardingState {
  const completed = state.completedSteps.includes(step)
    ? state.completedSteps
    : [...state.completedSteps, step];
  return { ...state, completedSteps: completed };
}

/** Compact 4-step card after wizard dismissed — site reviewer overflow journey. */
export function GettingStartedBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const state = readOnboardingState();
    setVisible(state.dismissed && state.completedSteps.length < ONBOARDING_STEP_ORDER.length);
  }, []);

  if (!visible) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">
        Resume setup anytime —{" "}
        <button
          type="button"
          className="font-medium text-sky-800 hover:underline"
          onClick={() => {
            writeOnboardingState({ ...readOnboardingState(), dismissed: false });
            window.location.reload();
          }}
        >
          reopen onboarding wizard
        </button>
        .
      </p>
    </section>
  );
}
