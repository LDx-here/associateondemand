/**
 * Interactive onboarding wizard state (Master Roadmap Phase 2).
 * Persisted in localStorage — dismissible, resumable across sessions.
 */

export const ONBOARDING_STORAGE_KEY = "aod-onboarding-wizard-v1";

export type OnboardingStepId = "welcome" | "firm-memory" | "assignment" | "assessment" | "review";

export type OnboardingState = {
  v: 1;
  dismissed: boolean;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
};

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  "welcome",
  "firm-memory",
  "assignment",
  "assessment",
  "review",
];

export const ONBOARDING_STEP_META: Record<
  OnboardingStepId,
  {
    title: string;
    detail: string;
    href?: "/firm-memory" | "/assignments/new" | "/matters" | "/inbox";
    cta?: string;
  }
> = {
  welcome: {
    title: "Welcome — overflow counsel",
    detail:
      "AssociateOnDemand takes drafting off your plate. Every deliverable is ready for your sign-off — capacity relief, not another overdue-task dashboard.",
  },
  "firm-memory": {
    title: "Set up Firm Memory",
    detail:
      "Upload style samples so overflow counsel drafts read like your in-house associate. Takes about five minutes.",
    href: "/firm-memory",
    cta: "Open Firm Memory setup",
  },
  assignment: {
    title: "Submit your first assignment",
    detail:
      "Pick a deliverable, answer practice-specific questions, and dispatch agents to draft it. Intelligent intake guides you field by field.",
    href: "/assignments/new",
    cta: "Start new assignment",
  },
  assessment: {
    title: "Upload case assessment",
    detail:
      "On the matter Documents tab, upload your completed case assessment scan. OCR feeds agent drafts automatically.",
    href: "/matters",
    cta: "Open matters",
  },
  review: {
    title: "Review deliverables",
    detail:
      "When a draft is ready, approve or request revisions from Inbox — no hunting through internal PM tools.",
    href: "/inbox",
    cta: "Open inbox",
  },
};

export function defaultOnboardingState(): OnboardingState {
  return {
    v: 1,
    dismissed: false,
    currentStep: "welcome",
    completedSteps: [],
  };
}

export function normalizeOnboardingState(raw: unknown): OnboardingState {
  const base = defaultOnboardingState();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<OnboardingState>;
  const completedSteps = Array.isArray(obj.completedSteps)
    ? obj.completedSteps.filter((s): s is OnboardingStepId =>
        ONBOARDING_STEP_ORDER.includes(s as OnboardingStepId),
      )
    : [];
  const currentStep =
    obj.currentStep && ONBOARDING_STEP_ORDER.includes(obj.currentStep)
      ? obj.currentStep
      : base.currentStep;
  return {
    v: 1,
    dismissed: Boolean(obj.dismissed),
    currentStep,
    completedSteps,
  };
}

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return defaultOnboardingState();
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return defaultOnboardingState();
    return normalizeOnboardingState(JSON.parse(raw));
  } catch {
    return defaultOnboardingState();
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function shouldShowWizard(state: OnboardingState = readOnboardingState()): boolean {
  if (state.dismissed) return false;
  if (state.completedSteps.length >= ONBOARDING_STEP_ORDER.length) return false;
  return true;
}

export function onboardingProgress(state: OnboardingState): { step: number; total: number; percent: number } {
  const total = ONBOARDING_STEP_ORDER.length;
  const completed = state.completedSteps.length;
  const step = Math.min(completed + 1, total);
  const percent = Math.round((completed / total) * 100);
  return { step, total, percent };
}

export function stepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

export function markStepComplete(state: OnboardingState, step: OnboardingStepId): OnboardingState {
  const completed = state.completedSteps.includes(step)
    ? state.completedSteps
    : [...state.completedSteps, step];
  const idx = stepIndex(step);
  const nextStep = ONBOARDING_STEP_ORDER[Math.min(idx + 1, ONBOARDING_STEP_ORDER.length - 1)];
  const allDone = ONBOARDING_STEP_ORDER.every((s) => completed.includes(s));
  return {
    ...state,
    completedSteps: completed,
    currentStep: allDone ? "review" : nextStep,
    dismissed: allDone ? true : state.dismissed,
  };
}

export function advanceOnboardingStep(state: OnboardingState): OnboardingState {
  const withComplete = markStepComplete(state, state.currentStep);
  const idx = stepIndex(withComplete.currentStep);
  if (idx >= ONBOARDING_STEP_ORDER.length - 1 && withComplete.completedSteps.includes("review")) {
    return dismissWizard(withComplete);
  }
  return withComplete;
}

export function goToOnboardingStep(state: OnboardingState, step: OnboardingStepId): OnboardingState {
  return { ...state, currentStep: step };
}

export function dismissWizard(state: OnboardingState): OnboardingState {
  return {
    ...state,
    dismissed: true,
    completedSteps: ONBOARDING_STEP_ORDER.filter(
      (s) => state.completedSteps.includes(s) || s === state.currentStep,
    ),
  };
}

export function resetOnboardingWizard(): OnboardingState {
  const fresh = defaultOnboardingState();
  writeOnboardingState(fresh);
  return fresh;
}
