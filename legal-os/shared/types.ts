export const MATTER_STAGES = [
  "intake",
  "conflict_check",
  "quote",
  "engagement",
  "drafting",
  "review",
  "delivery",
  "closed",
] as const;

export type MatterStage = (typeof MATTER_STAGES)[number];

export const STAGE_ORDER: Record<MatterStage, number> = {
  intake: 0,
  conflict_check: 1,
  quote: 2,
  engagement: 3,
  drafting: 4,
  review: 5,
  delivery: 6,
  closed: 7,
};

/** Valid forward transitions; intake may skip to quote (Quick Upload path). */
export function isValidStageTransition(from: MatterStage, to: MatterStage): boolean {
  if (from === to) return false;
  if (to === "closed" && STAGE_ORDER[from] < STAGE_ORDER.closed) return true;
  if (from === "intake" && to === "quote") return true;
  return STAGE_ORDER[to] === STAGE_ORDER[from] + 1;
}

export const STAGE_AGENT_TYPE: Partial<Record<MatterStage, string>> = {
  intake: "intake",
  conflict_check: "conflict",
  drafting: "drafting",
  review: "review",
  delivery: "communication",
};

export const STAGE_NEXT_ACTION: Partial<Record<MatterStage, string | null>> = {
  intake: "Process submission and extract facts",
  conflict_check: "Run conflict check against opposing party",
  quote: "Generate pricing quote",
  engagement: "Send engagement letter and collect payment",
  drafting: "Generate draft based on matter details and Firm Memory",
  review: "QA check on draft before delivery",
  delivery: "Deliver final document to client",
  closed: null,
};

export const BLOCKED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
];

export function validateWorkEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !BLOCKED_EMAIL_DOMAINS.includes(domain);
}

export type Urgency = "24h" | "48h" | "this_week" | "flexible";

export function calculatePrice(
  baseFee: number,
  urgency: Urgency,
  multipliers: { rush24h: number; rush48h: number; rushWeek: number },
  sampleDiscount: number,
  hasFirmMemorySamples: boolean
) {
  let price = baseFee;
  let urgencyMultiplier = 1;
  switch (urgency) {
    case "24h":
      urgencyMultiplier = multipliers.rush24h;
      break;
    case "48h":
      urgencyMultiplier = multipliers.rush48h;
      break;
    case "this_week":
      urgencyMultiplier = multipliers.rushWeek;
      break;
    default:
      break;
  }
  price *= urgencyMultiplier;
  const discount = hasFirmMemorySamples ? sampleDiscount : 0;
  if (hasFirmMemorySamples) {
    price *= 1 - sampleDiscount;
  }
  return {
    baseFee,
    urgencyMultiplier,
    sampleDiscount: discount,
    totalFee: Math.round(price * 100) / 100,
  };
}

export function buildDraftingPrompt(
  config: { systemPrompt?: string | null } | null,
  firmProfile: {
    writingTone?: string | null;
    citationStyle?: string | null;
    captionFormat?: string | null;
    formattingPreferences?: unknown;
    preferredArguments?: unknown;
    additionalNotes?: string | null;
  } | null,
  matter: {
    matterType: string;
    jurisdiction?: string | null;
    caption?: string | null;
    opposingParty?: string | null;
  }
): string {
  let prompt = config?.systemPrompt || "You are an expert legal drafting assistant.";

  prompt += `\n\nMATTER CONTEXT:\n`;
  prompt += `- Type: ${matter.matterType}\n`;
  prompt += `- Jurisdiction: ${matter.jurisdiction || "Not specified"}\n`;
  prompt += `- Caption: ${matter.caption || "Not specified"}\n`;
  prompt += `- Opposing Party: ${matter.opposingParty || "Not specified"}\n`;

  if (firmProfile) {
    prompt += `\n\nFIRM STYLE REQUIREMENTS (MUST FOLLOW):\n`;
    prompt += `- Writing Tone: ${firmProfile.writingTone || "Professional and formal"}\n`;
    prompt += `- Citation Style: ${firmProfile.citationStyle || "Bluebook"}\n`;
    prompt += `- Caption Format: ${firmProfile.captionFormat || "Standard"}\n`;
    if (firmProfile.formattingPreferences) {
      prompt += `- Formatting: ${JSON.stringify(firmProfile.formattingPreferences)}\n`;
    }
    if (firmProfile.preferredArguments) {
      prompt += `- Preferred Argument Patterns: ${JSON.stringify(firmProfile.preferredArguments)}\n`;
    }
    if (firmProfile.additionalNotes) {
      prompt += `- Additional Style Notes: ${firmProfile.additionalNotes}\n`;
    }
    prompt += `\nYou MUST match the firm's established writing style. The output should read as if it were written by the firm's own associate attorney.`;
  }

  return prompt;
}
