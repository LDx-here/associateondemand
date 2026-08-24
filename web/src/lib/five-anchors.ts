/**
 * The Five Anchors — the intake structure from the Master Blueprint.
 *
 * "No matter what is dumped into the system, whether it is a clean case
 * summary or a pile of random PDFs, the associate looks for the same five
 * anchors. If it can extract these, everything else can be built on top."
 *
 * Built manual-first, on her instruction: "intuitively prepared, manual, and
 * then we will one day add the ai intuitiveness." So every anchor is
 * answerable by typing today, and AI pre-fill is a later layer over the same
 * structure rather than a precondition for it. Nothing here calls a model.
 *
 * The fifth anchor is deliberately not last-and-least. The blueprint:
 * "Uncertainty and gaps ... is the most important. It is what separates this
 * system from every other AI legal tool. Most systems try to hide what they do
 * not know. This system surfaces it." So gaps get their own weight in the
 * completeness math and are never treated as an optional extra.
 */

export const ANCHOR_IDS = [
  "facts",
  "legal_context",
  "evidence",
  "posture",
  "gaps",
] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

export type AnchorPrompt = {
  id: string;
  /** The question as the blueprint phrases it — asked, not labelled. */
  question: string;
  /** Shown under the field; concrete enough to answer without guessing. */
  hint?: string;
};

export type AnchorDef = {
  id: AnchorId;
  title: string;
  /** What this anchor captures, in the blueprint's words. */
  captures: string;
  prompts: AnchorPrompt[];
};

export const FIVE_ANCHORS: AnchorDef[] = [
  {
    id: "facts",
    title: "Facts",
    captures:
      "What happened? Who is involved? When and where? The raw narrative, even if incomplete or contradictory.",
    prompts: [
      { id: "parties", question: "Who are the parties?", hint: "Client, opposing party, agency, insurer — and their roles." },
      { id: "incident", question: "What is the core incident or triggering event?" },
      { id: "timeline", question: "What is the timeline?", hint: "Dates you know. Contradictions are fine — note them rather than resolving them." },
      { id: "location", question: "Where did this happen, and where is the client now?" },
    ],
  },
  {
    id: "legal_context",
    title: "Legal context",
    captures:
      "What area of law is implicated? What are the potential claims, defenses, or issues?",
    prompts: [
      { id: "practice_area", question: "What area of law is this?", hint: "Immigration, personal injury, property damage." },
      { id: "governing_law", question: "What statute or regulation governs?", hint: "INA §, CFR, Ohio Rev. Code — as specific as you have it." },
      { id: "elements", question: "What elements must be proven?" },
      { id: "relief", question: "What relief or outcome is sought?" },
    ],
  },
  {
    id: "evidence",
    title: "Documents and evidence",
    captures:
      "What documents exist? What records are referenced? What is available or missing?",
    prompts: [
      { id: "on_hand", question: "What do we have?", hint: "Police report, medical records, prior filings, correspondence, photographs." },
      { id: "referenced", question: "What is referenced but not in hand?" },
      { id: "requested", question: "What has been requested, and from whom?" },
    ],
  },
  {
    id: "posture",
    title: "Procedural posture",
    captures:
      "Where is this matter in the legal process? Intake, pre-litigation, active litigation, appeal, post-judgment?",
    prompts: [
      { id: "filed", question: "Has anything been filed?" },
      { id: "pending", question: "Is there a pending hearing or deadline?", hint: "Dates here should also go on the matter so they reach the calendar." },
      { id: "decision_maker", question: "Who is the decision-maker?", hint: "IJ, USCIS officer, adjuster, court." },
      { id: "history", question: "What has already happened procedurally?" },
    ],
  },
  {
    id: "gaps",
    title: "Uncertainty and gaps",
    captures:
      "What is missing? What is unclear? What is unresolved? This is the anchor that matters most — surface what you do not know rather than hiding it.",
    prompts: [
      { id: "unknowns", question: "What do we not know that we need to know?" },
      { id: "assumptions", question: "What are we assuming?", hint: "Anything you are treating as true without having confirmed it." },
      { id: "incomplete", question: "Where is the record incomplete or contradictory?" },
      { id: "blocking", question: "What would change the analysis if it turned out differently?" },
    ],
  },
];

export const ANCHOR_BY_ID: Record<AnchorId, AnchorDef> = Object.fromEntries(
  FIVE_ANCHORS.map((a) => [a.id, a]),
) as Record<AnchorId, AnchorDef>;

/** Answers keyed `"<anchorId>.<promptId>"`, e.g. "facts.parties". */
export type AnchorAnswers = Record<string, string>;

export type AnchorIntake = {
  matterId: string;
  answers: AnchorAnswers;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
};

export function answerKey(anchorId: AnchorId, promptId: string): string {
  return `${anchorId}.${promptId}`;
}

export function emptyAnchorIntake(matterId: string): AnchorIntake {
  return { matterId, answers: {}, updatedAt: new Date().toISOString() };
}

export type AnchorProgress = {
  anchorId: AnchorId;
  answered: number;
  total: number;
};

export function anchorProgress(intake: AnchorIntake): AnchorProgress[] {
  return FIVE_ANCHORS.map((anchor) => ({
    anchorId: anchor.id,
    total: anchor.prompts.length,
    answered: anchor.prompts.filter((p) =>
      Boolean(intake.answers[answerKey(anchor.id, p.id)]?.trim()),
    ).length,
  }));
}

/**
 * Which anchors have nothing in them yet.
 *
 * This is the system "knowing what it does not understand" at the intake
 * level: an untouched anchor is a stated gap, not an empty form field.
 */
export function unansweredAnchors(intake: AnchorIntake): AnchorId[] {
  return anchorProgress(intake)
    .filter((p) => p.answered === 0)
    .map((p) => p.anchorId);
}

export type IntakeReadiness = {
  answered: number;
  total: number;
  /** 0–100 across all prompts. */
  percent: number;
  /** True once every anchor has at least one answer. */
  everyAnchorStarted: boolean;
  /** True when gaps has been addressed — tracked separately by design. */
  gapsAddressed: boolean;
};

export function intakeReadiness(intake: AnchorIntake): IntakeReadiness {
  const progress = anchorProgress(intake);
  const answered = progress.reduce((sum, p) => sum + p.answered, 0);
  const total = progress.reduce((sum, p) => sum + p.total, 0);
  const gaps = progress.find((p) => p.anchorId === "gaps");

  return {
    answered,
    total,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
    everyAnchorStarted: progress.every((p) => p.answered > 0),
    // Called out on its own because a "complete" intake that never said what
    // it does not know is the failure mode the blueprint exists to prevent.
    gapsAddressed: (gaps?.answered ?? 0) > 0,
  };
}

/**
 * The anchors as prose, for the case story and for handing to a drafting
 * agent later. Only answered prompts appear — an unanswered question is not
 * rendered as an empty heading.
 */
export function formatAnchorsForReading(intake: AnchorIntake): string {
  const blocks: string[] = [];

  for (const anchor of FIVE_ANCHORS) {
    const lines = anchor.prompts
      .map((p) => {
        const value = intake.answers[answerKey(anchor.id, p.id)]?.trim();
        return value ? `${p.question} ${value}` : null;
      })
      .filter((l): l is string => l !== null);

    if (lines.length > 0) blocks.push(`${anchor.title}\n${lines.join("\n")}`);
  }

  const missing = unansweredAnchors(intake);
  if (missing.length > 0) {
    blocks.push(
      `Not yet addressed: ${missing.map((id) => ANCHOR_BY_ID[id].title).join(", ")}.`,
    );
  }

  return blocks.join("\n\n");
}

/** Note type used to persist the intake, mirroring how drafting facts store. */
export const ANCHOR_NOTE_TYPE = "Anchors";

export function serializeAnchorIntake(intake: AnchorIntake): string {
  return `${ANCHOR_NOTE_TYPE}\n${JSON.stringify(intake)}`;
}

export function parseAnchorIntakeNote(content: string, matterId: string): AnchorIntake | null {
  const body = content.startsWith(ANCHOR_NOTE_TYPE)
    ? content.slice(ANCHOR_NOTE_TYPE.length).trim()
    : content.trim();
  if (!body) return null;

  try {
    const parsed = JSON.parse(body) as Partial<AnchorIntake>;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    // Keep only string answers — a malformed note must not poison the form.
    const answers: AnchorAnswers = {};
    for (const [key, value] of Object.entries(parsed.answers)) {
      if (typeof value === "string") answers[key] = value;
    }
    return {
      matterId: parsed.matterId ?? matterId,
      answers,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
