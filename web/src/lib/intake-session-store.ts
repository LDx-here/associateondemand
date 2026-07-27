/**
 * Server-side abandoned intake sessions — Notes (Airtable) or JSON file (demo).
 * Port pattern from legal-os/server/handlers/abandonedSessions.ts.
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";

import {
  createNoteInAirtable,
  updateNoteInAirtable,
} from "@/lib/airtable/queries";
import { isDemoMode, listAllNotes } from "@/lib/data-store";

export type StoredIntakeSession = {
  sessionId: string;
  email: string;
  step?: number;
  deliverableId?: string;
  matterId?: string;
  savedAt: string;
  followUpSent?: boolean;
};

const INTAKE_SESSION_TYPE = "IntakeSession";
const INTAKE_SESSION_AUTHOR = "IntakeSession";
const SYSTEM_MATTER_BUCKET = "AOD-1001";
const STALE_MS = 24 * 60 * 60 * 1000;

function sessionsFilePath(): string {
  return path.join(process.cwd(), "..", "data", "intake-sessions.json");
}

function parseSessionContent(raw: string): StoredIntakeSession | null {
  try {
    const parsed = JSON.parse(raw) as StoredIntakeSession;
    if (!parsed?.sessionId || !parsed?.email || !parsed?.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readDemoSessions(): Promise<StoredIntakeSession[]> {
  try {
    const raw = await readFile(sessionsFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as StoredIntakeSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeDemoSessions(sessions: StoredIntakeSession[]): Promise<void> {
  await writeFile(sessionsFilePath(), JSON.stringify(sessions, null, 2), "utf-8");
}

async function listAirtableSessions(): Promise<Array<StoredIntakeSession & { noteId: string }>> {
  const notes = await listAllNotes();
  const out: Array<StoredIntakeSession & { noteId: string }> = [];
  for (const note of notes) {
    if (note.type !== INTAKE_SESSION_TYPE) continue;
    const session = parseSessionContent(note.content);
    if (session) out.push({ ...session, noteId: note.id });
  }
  return out;
}

export async function upsertIntakeSession(payload: {
  sessionId: string;
  email: string;
  step?: number;
  deliverableId?: string;
  matterId?: string;
}): Promise<StoredIntakeSession> {
  const email = payload.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required to save intake progress.");
  }

  const now = new Date().toISOString();
  const session: StoredIntakeSession = {
    sessionId: payload.sessionId.trim() || `sess-${Date.now()}`,
    email,
    step: payload.step,
    deliverableId: payload.deliverableId,
    matterId: payload.matterId,
    savedAt: now,
    followUpSent: false,
  };

  if (isDemoMode()) {
    const sessions = await readDemoSessions();
    const idx = sessions.findIndex((s) => s.sessionId === session.sessionId || s.email === email);
    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], ...session, followUpSent: sessions[idx].followUpSent ?? false };
    } else {
      sessions.push(session);
    }
    await writeDemoSessions(sessions);
    return session;
  }

  const existing = await listAirtableSessions();
  const hit = existing.find((s) => s.sessionId === session.sessionId || s.email === email);
  const matterCode = payload.matterId?.trim() || SYSTEM_MATTER_BUCKET;
  const content = JSON.stringify(session);

  if (hit) {
    await updateNoteInAirtable(hit.noteId, matterCode, content, INTAKE_SESSION_AUTHOR);
    return session;
  }

  await createNoteInAirtable(matterCode, content, INTAKE_SESSION_AUTHOR, INTAKE_SESSION_TYPE);
  return session;
}

export async function listStaleIntakeSessions(nowMs = Date.now()): Promise<StoredIntakeSession[]> {
  if (isDemoMode()) {
    const sessions = await readDemoSessions();
    return sessions.filter((s) => !s.followUpSent && nowMs - new Date(s.savedAt).getTime() >= STALE_MS);
  }

  const sessions = await listAirtableSessions();
  return sessions.filter((s) => !s.followUpSent && nowMs - new Date(s.savedAt).getTime() >= STALE_MS);
}

export async function markIntakeFollowUpSent(sessionId: string): Promise<void> {
  if (isDemoMode()) {
    const sessions = await readDemoSessions();
    const idx = sessions.findIndex((s) => s.sessionId === sessionId);
    if (idx >= 0) {
      sessions[idx].followUpSent = true;
      await writeDemoSessions(sessions);
    }
    return;
  }

  const sessions = await listAirtableSessions();
  const hit = sessions.find((s) => s.sessionId === sessionId);
  if (!hit) return;
  const updated: StoredIntakeSession = { ...hit, followUpSent: true };
  const matterCode = hit.matterId?.trim() || SYSTEM_MATTER_BUCKET;
  await updateNoteInAirtable(hit.noteId, matterCode, JSON.stringify(updated), INTAKE_SESSION_AUTHOR);
}

export async function sendAbandonedIntakeEmail(session: StoredIntakeSession): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://aod-next.vercel.app";
  const params = new URLSearchParams();
  if (session.deliverableId) params.set("deliverable", session.deliverableId);
  if (session.matterId) params.set("matterId", session.matterId);
  const resumeUrl = `${baseUrl}/assignments/new${params.toString() ? `?${params}` : ""}`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.INTAKE_FOLLOWUP_FROM?.trim() || process.env.ASSIGNMENT_NOTIFY_FROM?.trim() || "AssociateOnDemand <onboarding@resend.dev>",
      to: [session.email],
      subject: "Complete your AssociateOnDemand assignment request",
      html: `<p>You started an overflow counsel assignment on AssociateOnDemand. <a href="${resumeUrl}">Continue where you left off</a>.</p>`,
    }),
  });
  return resp.ok;
}
