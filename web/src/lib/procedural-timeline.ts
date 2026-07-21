/** Procedural filing milestones — stored in Notes (type Procedural) as JSON. */

export type ProceduralStep = {
  id: string;
  filingName: string;
  dateFiled: string;
  courtOrStatus: string;
  notes: string;
};

export type ProceduralTimelinePayload = {
  v: 1;
  matterId: string;
  steps: ProceduralStep[];
  updatedAt?: string;
};

export const PROCEDURAL_TIMELINE_NOTE_TYPE = "Procedural";

export function emptyProceduralTimeline(matterId: string): ProceduralTimelinePayload {
  return { v: 1, matterId, steps: [], updatedAt: new Date().toISOString() };
}

export function serializeProceduralTimeline(payload: ProceduralTimelinePayload): string {
  return JSON.stringify({ ...payload, updatedAt: new Date().toISOString() });
}

export function parseProceduralTimeline(raw: string, matterId: string): ProceduralTimelinePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProceduralTimelinePayload>;
    if (parsed.v !== 1) return null;
    return {
      v: 1,
      matterId,
      steps: (parsed.steps ?? []).map((step, index) => ({
        id: step.id ?? `step-${index}`,
        filingName: step.filingName ?? "",
        dateFiled: step.dateFiled ?? "",
        courtOrStatus: step.courtOrStatus ?? "",
        notes: step.notes ?? "",
      })),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function newProceduralStep(): ProceduralStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filingName: "",
    dateFiled: "",
    courtOrStatus: "",
    notes: "",
  };
}
