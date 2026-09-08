/**
 * Case journeys — where a matter started, where it is, and what comes next.
 *
 * Her ask: "the timeline I want to be able to see: okay, this is where we
 * started, this is where we are right now, and based on the template, this is
 * typically the last of the pieces that we'll have to anticipate in
 * preparation."
 *
 * The steps below are transcribed from how she described her own two case
 * types, not invented from a treatise. Where the wording is hers it is kept.
 *
 * The load-bearing idea is `awaiting`. Her description kept returning to it —
 * "now we're just waiting on biometrics," "waiting on a date for the court,"
 * "we're just waiting on the settlement." Half of practice is knowing whether
 * the ball is in your court or theirs, and a status word alone never says.
 *
 * Manual by construction, like the anchors: she sets where the matter stands.
 * Posture gives a first guess so the panel is never blank, and her pick always
 * wins.
 */

export const JOURNEY_IDS = ["removal_defense", "injury_claim"] as const;
export type JourneyId = (typeof JOURNEY_IDS)[number];

export type JourneyStep = {
  id: string;
  label: string;
  /** What this step is, in practice terms. */
  detail?: string;
  /**
   * Whose move it is while the matter sits on this step. "you" means the
   * matter is waiting on her; "them" means it is out of her hands.
   */
  awaiting: "you" | "them";
  /** What this step typically requires — the "anticipate in preparation" part. */
  prepare?: string[];
};

export type CaseJourney = {
  id: JourneyId;
  title: string;
  /** Case types this journey is proposed for. */
  caseTypes: string[];
  steps: JourneyStep[];
};

/**
 * Removal defense, as she walked it: NTA, master calendar, E-28, written
 * pleadings both ways, scheduling order both ways, biometrics, then the long
 * wait for an individual hearing date — and the moment that date lands is
 * when preparation starts in earnest.
 */
const REMOVAL_DEFENSE: CaseJourney = {
  id: "removal_defense",
  title: "Removal defense",
  caseTypes: ["Immigration"],
  steps: [
    {
      id: "nta",
      label: "Notice to Appear issued",
      detail: "Where the case starts — DHS files the NTA and proceedings begin.",
      awaiting: "you",
      prepare: ["Copy of the NTA", "Confirm the charges and allegations", "Client intake"],
    },
    {
      id: "mch_scheduled",
      label: "Master calendar hearing scheduled",
      detail: "The court sets the first appearance.",
      awaiting: "them",
      prepare: ["Calendar the MCH date", "Confirm the immigration court and IJ"],
    },
    {
      id: "e28",
      label: "EOIR-28 filed",
      detail: "Notice of appearance — representation is on the record.",
      awaiting: "you",
      prepare: ["EOIR-28", "Signed fee agreement"],
    },
    {
      id: "pleadings_received",
      label: "Written pleadings received",
      detail: "The court orders written pleadings instead of oral pleading at the MCH.",
      awaiting: "them",
    },
    {
      id: "pleadings_filed",
      label: "Response to written pleadings filed",
      detail: "Admissions and denials, concessions, and relief sought.",
      awaiting: "you",
      prepare: ["Pleading response", "Identify the relief being sought", "Any I-589 or other application"],
    },
    {
      id: "scheduling_order",
      label: "Scheduling order received",
      detail: "The court sets the filing deadlines for the individual hearing.",
      awaiting: "them",
      prepare: ["Calendar every deadline in the order"],
    },
    {
      id: "scheduling_response",
      label: "Response to scheduling order filed",
      awaiting: "you",
    },
    {
      id: "biometrics",
      label: "Biometrics",
      detail:
        "Waiting on the biometrics instructions. Where nothing arrives, the practice is to notify the court that the client complied.",
      awaiting: "them",
      prepare: ["Confirm the client completed biometrics", "Notice of compliance if no instructions issued"],
    },
    {
      id: "awaiting_ih_date",
      label: "Waiting on an individual hearing date",
      detail: "Out of your hands until the court calendars it.",
      awaiting: "them",
    },
    {
      id: "ih_prep",
      label: "Individual hearing date set — preparing",
      detail:
        "Once the date lands, preparation starts: evidence, declaration, witness testimony, the full packet.",
      awaiting: "you",
      prepare: [
        "Client declaration",
        "Country conditions evidence",
        "Witness list and testimony",
        "Exhibit index and hearing packet",
        "Pre-hearing brief",
      ],
    },
    {
      id: "individual_hearing",
      label: "Individual hearing",
      awaiting: "you",
      prepare: ["Witness prep", "Direct examination outline", "Client prepared for cross"],
    },
    {
      id: "decision",
      label: "Decision",
      detail: "The IJ rules. Appeal deadline runs from here.",
      awaiting: "them",
      prepare: ["Calendar the 30-day BIA appeal deadline if the decision is adverse"],
    },
  ],
};

/**
 * Injury claim, as she walked Hammond: a UM claim, so the investigation is
 * front-loaded, then the letter of rep, then the long wait on the carrier —
 * and once an offer lands the work turns into accounting and liens.
 */
const INJURY_CLAIM: CaseJourney = {
  id: "injury_claim",
  title: "Injury claim",
  caseTypes: ["Personal Injury", "PI", "Property Damage"],
  steps: [
    {
      id: "incident",
      label: "Injury",
      detail: "The incident itself — where the claim starts.",
      awaiting: "you",
      prepare: ["Client intake", "Date and place of the incident", "Insurance coverage in play"],
    },
    {
      id: "investigation",
      label: "Investigation",
      detail:
        "Building the file: police report, medical records, treatment status. On a UM claim this is heavier up front, since the carrier is the client's own.",
      awaiting: "you",
      prepare: [
        "Police report",
        "Medical records and bills",
        "Treatment status — still treating or released",
        "Coverage check: UM/UIM limits, med pay",
      ],
    },
    {
      id: "lor",
      label: "Letter of representation sent",
      detail: "Rep letter out to the adjuster; the claim is now yours on the record.",
      awaiting: "you",
      prepare: ["Letter of representation", "Claim number and adjuster contact"],
    },
    {
      id: "adjuster_inquiries",
      label: "Responded to adjuster inquiries",
      detail: "Whatever the carrier asked for — records authorizations, statements, documentation.",
      awaiting: "you",
    },
    {
      id: "awaiting_offer",
      label: "Waiting on the settlement offer",
      detail: "With the carrier. Nothing to do but follow up on a cadence.",
      awaiting: "them",
      prepare: ["Follow-up schedule so the claim does not go quiet"],
    },
    {
      id: "offer_received",
      label: "Settlement offer received",
      awaiting: "you",
      prepare: ["Evaluate the offer against the medicals", "Client consultation on the offer"],
    },
    {
      id: "accounting",
      label: "Accounting and liens",
      detail:
        "What expenses you incurred handling it, what has to come out of the recovery, and every lien — Medicaid, medical providers, subrogation.",
      awaiting: "you",
      prepare: [
        "Case expenses you advanced",
        "Medical bills to be paid from the recovery",
        "Medicaid lien — request and negotiate the final figure",
        "Any provider or subrogation liens",
        "Fee calculation",
      ],
    },
    {
      id: "disbursement",
      label: "Settlement statement and disbursement",
      detail: "Client signs the statement, funds clear, liens are paid, the client is paid.",
      awaiting: "you",
      prepare: ["Signed settlement statement", "Release", "Lien payoffs", "Client disbursement"],
    },
  ],
};

export const CASE_JOURNEYS: CaseJourney[] = [REMOVAL_DEFENSE, INJURY_CLAIM];

export const JOURNEY_BY_ID: Record<JourneyId, CaseJourney> = Object.fromEntries(
  CASE_JOURNEYS.map((j) => [j.id, j]),
) as Record<JourneyId, CaseJourney>;

/** Which journey to propose for a matter, by its case type. Null when unsure. */
export function proposeJourneyId(caseType: string | null | undefined): JourneyId | null {
  const value = (caseType ?? "").trim().toLowerCase();
  if (!value) return null;
  for (const journey of CASE_JOURNEYS) {
    if (journey.caseTypes.some((t) => t.toLowerCase() === value)) return journey.id;
  }
  return null;
}

/**
 * A first guess at the current step from the matter's procedural posture, so
 * the panel opens on something rather than nothing. Deliberately conservative:
 * an unrecognized posture returns null and the panel asks her instead of
 * asserting a position in the case that may be wrong.
 */
const POSTURE_TO_STEP: Record<JourneyId, Record<string, string>> = {
  removal_defense: {
    Intake: "nta",
    "Representation Filed": "e28",
    Filed: "pleadings_filed",
    "Responsive Pleading Filed": "pleadings_filed",
    "Awaiting Scheduling": "awaiting_ih_date",
    "Hearing Scheduled": "ih_prep",
    "Awaiting Decision": "decision",
  },
  injury_claim: {
    Intake: "incident",
    "Representation Filed": "lor",
    Filed: "adjuster_inquiries",
    "Responsive Pleading Filed": "adjuster_inquiries",
    "Awaiting Scheduling": "awaiting_offer",
    "Hearing Scheduled": "offer_received",
    "Awaiting Decision": "awaiting_offer",
  },
};

export function proposeCurrentStepId(
  journeyId: JourneyId,
  proceduralPosture: string | null | undefined,
): string | null {
  const posture = (proceduralPosture ?? "").trim();
  if (!posture) return null;
  return POSTURE_TO_STEP[journeyId]?.[posture] ?? null;
}

/** Persisted per matter, as a typed Note. */
export type JourneyState = {
  matterId: string;
  journeyId: JourneyId;
  currentStepId: string;
  updatedAt: string;
};

export type JourneyPosition = {
  journey: CaseJourney;
  /** Steps already behind the matter. */
  completed: JourneyStep[];
  current: JourneyStep;
  /** The immediately next step, when there is one. */
  next: JourneyStep | null;
  /** Everything after `next`. */
  later: JourneyStep[];
  /** 1-based position, for "step 8 of 12". */
  stepNumber: number;
  totalSteps: number;
  /** Whose move it is right now. */
  awaiting: "you" | "them";
  /**
   * What to have ready — this step's own prep plus the next step's, since her
   * ask was to see "the last of the pieces that we'll have to anticipate in
   * preparation" before they are due.
   */
  prepare: string[];
};

export function journeyPosition(state: JourneyState): JourneyPosition | null {
  const journey = JOURNEY_BY_ID[state.journeyId];
  if (!journey) return null;
  const index = journey.steps.findIndex((s) => s.id === state.currentStepId);
  if (index < 0) return null;

  const current = journey.steps[index];
  const next = journey.steps[index + 1] ?? null;

  // Deduplicate: the same item can be prep for two adjacent steps, and showing
  // it twice makes the list look longer than the work actually is.
  const prepare = [...(current.prepare ?? []), ...(next?.prepare ?? [])];

  return {
    journey,
    completed: journey.steps.slice(0, index),
    current,
    next,
    later: journey.steps.slice(index + 2),
    stepNumber: index + 1,
    totalSteps: journey.steps.length,
    awaiting: current.awaiting,
    prepare: [...new Set(prepare)],
  };
}

/** One line for the case story: where this stands on its journey. */
export function journeySentence(position: JourneyPosition): string {
  const { current, next, awaiting } = position;
  const where = `${position.journey.title}: ${current.label.toLowerCase()}`;
  const ball =
    awaiting === "them"
      ? "The next move is theirs."
      : "The next move is yours.";
  const ahead = next ? ` Next is ${next.label.toLowerCase()}.` : " This is the last step.";
  return `${where}. ${ball}${ahead}`;
}

export const JOURNEY_NOTE_TYPE = "Journey";

export function serializeJourneyState(state: JourneyState): string {
  return `${JOURNEY_NOTE_TYPE}\n${JSON.stringify(state)}`;
}

export function parseJourneyStateNote(content: string, matterId: string): JourneyState | null {
  const body = content.startsWith(JOURNEY_NOTE_TYPE)
    ? content.slice(JOURNEY_NOTE_TYPE.length).trim()
    : content.trim();
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as Partial<JourneyState>;
    if (!parsed || typeof parsed !== "object") return null;
    const journeyId = parsed.journeyId;
    if (!journeyId || !JOURNEY_BY_ID[journeyId]) return null;
    const currentStepId = parsed.currentStepId;
    if (typeof currentStepId !== "string") return null;
    // A step id that no longer exists (template edited) must not wedge the
    // panel — drop back to null so she is asked rather than shown a wrong spot.
    if (!JOURNEY_BY_ID[journeyId].steps.some((s) => s.id === currentStepId)) return null;
    return {
      matterId: parsed.matterId ?? matterId,
      journeyId,
      currentStepId,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
