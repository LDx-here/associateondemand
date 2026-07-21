/**
 * Abandoned intake recovery — localStorage session for /assignments/new.
 * Light port of legal-os abandoned-session follow-up (client-side only).
 */

const INTAKE_SESSION_KEY = "aod:intake-session-v1";

export type IntakeSession = {
  sessionId?: string;
  savedAt: string;
  email?: string;
  deliverableId?: string;
  matterMode?: "existing" | "new";
  existingMatterId?: string;
  newTitle?: string;
  deliverableType?: string;
  step?: number;
};

export function intakeSessionId(): string {
  if (typeof window === "undefined") return `sess-${Date.now()}`;
  const key = "aod:intake-session-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function loadIntakeSession(): IntakeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTAKE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakeSession;
    if (!parsed?.savedAt) return null;
    const ageMs = Date.now() - new Date(parsed.savedAt).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(INTAKE_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveIntakeSession(session: Omit<IntakeSession, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: IntakeSession = { ...session, savedAt: new Date().toISOString() };
  localStorage.setItem(INTAKE_SESSION_KEY, JSON.stringify(payload));
}

export function clearIntakeSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INTAKE_SESSION_KEY);
}

export function hasResumableIntake(session: IntakeSession | null): boolean {
  if (!session) return false;
  return Boolean(session.deliverableId || session.newTitle || session.existingMatterId);
}

export function intakeResumeHref(session: IntakeSession): string {
  const params = new URLSearchParams();
  if (session.deliverableId) params.set("deliverable", session.deliverableId);
  if (session.existingMatterId) params.set("matterId", session.existingMatterId);
  const qs = params.toString();
  return qs ? `/assignments/new?${qs}` : "/assignments/new";
}
