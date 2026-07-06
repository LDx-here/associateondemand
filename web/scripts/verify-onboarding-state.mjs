#!/usr/bin/env node
/** Verify onboarding wizard state helpers (Phase 2 pass 15). */
import assert from "node:assert/strict";

import {
  advanceOnboardingStep,
  defaultOnboardingState,
  dismissWizard,
  markStepComplete,
  normalizeOnboardingState,
  onboardingProgress,
  ONBOARDING_STEP_ORDER,
  shouldShowWizard,
} from "../src/lib/onboarding-state.ts";

const fresh = defaultOnboardingState();
assert.equal(fresh.v, 1);
assert.equal(fresh.dismissed, false);
assert.equal(fresh.currentStep, "welcome");
assert.deepEqual(fresh.completedSteps, []);
assert.equal(shouldShowWizard(fresh), true);

const afterWelcome = markStepComplete(fresh, "welcome");
assert.ok(afterWelcome.completedSteps.includes("welcome"));
assert.equal(afterWelcome.currentStep, "firm-memory");

const advanced = advanceOnboardingStep(afterWelcome);
assert.ok(advanced.completedSteps.includes("welcome"));

const dismissed = dismissWizard(fresh);
assert.equal(dismissed.dismissed, true);
assert.equal(shouldShowWizard(dismissed), false);

const progress = onboardingProgress({
  ...fresh,
  completedSteps: ["welcome", "firm-memory"],
});
assert.equal(progress.step, 3);
assert.equal(progress.total, ONBOARDING_STEP_ORDER.length);
assert.equal(progress.percent, 40);

const normalized = normalizeOnboardingState({
  v: 1,
  dismissed: false,
  currentStep: "bogus",
  completedSteps: ["welcome", "invalid"],
});
assert.equal(normalized.currentStep, "welcome");
assert.deepEqual(normalized.completedSteps, ["welcome"]);

console.log("verify-onboarding-state: OK");
