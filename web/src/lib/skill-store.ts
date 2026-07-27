import {
  createCorrectionInAirtable,
  createStrategyPatternInAirtable,
} from "./airtable/queries";
import { isDemoMode, usesGoogleSheets } from "./data-store-config";
import {
  createCorrectionInGoogleSheets,
  createStrategyPatternInGoogleSheets,
} from "./google-sheets/queries";

export async function saveAttorneySkill(payload: {
  name: string;
  description?: string;
  trigger?: string;
  body: string;
  agent?: string;
  matterCode?: string;
  originalOutput?: string;
}): Promise<{ patternId: string; correctionId: string }> {
  if (isDemoMode()) {
    throw new Error("Sample data mode. Connect Google Sheets or Airtable to save skills.");
  }

  const skillBody = payload.body.trim();
  const originalOutput = (payload.originalOutput ?? skillBody).trim();

  if (usesGoogleSheets()) {
    const pattern = await createStrategyPatternInGoogleSheets({
      name: payload.name,
      description: payload.description,
      trigger: payload.trigger,
      body: skillBody,
      agent: payload.agent,
      matterCode: payload.matterCode,
      correctionNote:
        originalOutput !== skillBody ? `Refined from agent output on ${payload.matterCode || "matter"}` : undefined,
    });
    const correction = await createCorrectionInGoogleSheets({
      agent: payload.agent ?? "attorney-skill",
      matterCode: payload.matterCode,
      originalOutput: originalOutput.slice(0, 4000),
      attorneyEdit: skillBody.slice(0, 4000),
      correctionType: "Analytical",
      reason: payload.trigger || payload.description || `Saved as skill: ${payload.name}`,
      appliedTo: "Strategy Patterns",
    });
    return { patternId: pattern.id, correctionId: correction.id };
  }

  const pattern = await createStrategyPatternInAirtable({
    name: payload.name,
    description: payload.description,
    trigger: payload.trigger,
    body: skillBody,
    agent: payload.agent,
    matterCode: payload.matterCode,
    correctionNote:
      originalOutput !== skillBody ? `Refined from agent output on ${payload.matterCode || "matter"}` : undefined,
  });

  const correction = await createCorrectionInAirtable({
    agent: payload.agent ?? "attorney-skill",
    matterCode: payload.matterCode,
    originalOutput: originalOutput.slice(0, 4000),
    attorneyEdit: skillBody.slice(0, 4000),
    correctionType: "Analytical",
    reason: payload.trigger || payload.description || `Saved as skill: ${payload.name}`,
    appliedTo: "Strategy Patterns",
  });

  return { patternId: pattern.id, correctionId: correction.id };
}
