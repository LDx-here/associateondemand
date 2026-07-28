import {
  completeTaskInAirtable,
  updateTaskInAirtable,
  createAssignmentInAirtable,
  createEventInAirtable,
  createLegalElementInAirtable,
  createNoteInAirtable,
  createTaskInAirtable,
  findLatestAgentNoteForMatter,
  findLatestAssessmentOcrNoteForMatter,
  findLatestDraftingFactsNoteForMatter,
  findLatestProceduralTimelineNoteForMatter,
  getCaseAssessmentFromAirtable,
  listDocumentsFromAirtable,
  listAssessmentTemplatesFromAirtable,
  listFirmSampleDocumentsFromAirtable,
  listDeliverableTemplateDocumentsFromAirtable,
  countFirmMemoryPatternsFromAirtable,
  registerAssessmentDocumentInAirtable,
  listEventsForMatterFromAirtable,
  listEventsFromAirtable,
  listInboxItemsFromAirtable,
  listLegalElementsFromAirtable,
  listContactsFromAirtable,
  getContactFromAirtable,
  listContactsForMatterFromAirtable,
  createContactInAirtable,
  linkContactToMatterInAirtable,
  unlinkContactFromMatterInAirtable,
  listMattersFromAirtable,
  getMatterFromAirtable,
  createMatterInAirtable,
  ensureFirmTemplateMatterInAirtable,
  listAllNotesFromAirtable,
  listAllTasksFromAirtable,
  listNotesForMatterFromAirtable,
  listTasksForMatterFromAirtable,
  saveCaseAssessmentInAirtable,
  updateAssignmentStatusInAirtable,
  updateAssignmentPaymentInAirtable,
  markAssignmentDeliveredInAirtable,
  getInboxItemByIdFromAirtable,
  resolveInboxItemInAirtable,
  updateLegalElementInAirtable,
  updateMatterDeadlineInAirtable,
  updateMatterInAirtable,
  updateNoteInAirtable,
} from "./airtable/queries";
import { isAirtableQuotaError } from "./airtable/client";
import { isDemoMode, usesGoogleSheets } from "./data-store-config";
import { isGoogleSheetsReadError } from "./google-sheets/client";
import {
  completeTaskInGoogleSheets,
  updateTaskInGoogleSheets,
  createContactInGoogleSheets,
  createEventInGoogleSheets,
  createLegalElementInGoogleSheets,
  createMatterInGoogleSheets,
  createNoteInGoogleSheets,
  createTaskInGoogleSheets,
  ensureFirmTemplateMatterInGoogleSheets,
  findLatestAgentNoteForMatterFromGoogleSheets,
  findLatestAssessmentOcrNoteForMatterFromGoogleSheets,
  findLatestDraftingFactsNoteForMatterFromGoogleSheets,
  findLatestProceduralTimelineNoteForMatterFromGoogleSheets,
  getCaseAssessmentFromGoogleSheets,
  getContactFromGoogleSheets,
  getMatterFromGoogleSheets,
  linkContactToMatterInGoogleSheets,
  listAllNotesFromGoogleSheets,
  listAllTasksFromGoogleSheets,
  listContactsForMatterFromGoogleSheets,
  listContactsFromGoogleSheets,
  listEventsForMatterFromGoogleSheets,
  listEventsFromGoogleSheets,
  listLegalElementsFromGoogleSheets,
  listMattersFromGoogleSheets,
  listNotesForMatterFromGoogleSheets,
  listTasksForMatterFromGoogleSheets,
  saveCaseAssessmentInGoogleSheets,
  unlinkContactFromMatterInGoogleSheets,
  updateLegalElementInGoogleSheets,
  updateMatterDeadlineInGoogleSheets,
  updateMatterInGoogleSheets,
  updateNoteInGoogleSheets,
  listInboxItemsFromGoogleSheets,
  getInboxItemByIdFromGoogleSheets,
  createAssignmentInGoogleSheets,
  updateAssignmentStatusInGoogleSheets,
  updateAssignmentPaymentInGoogleSheets,
  markAssignmentDeliveredInGoogleSheets,
  resolveInboxItemInGoogleSheets,
  listDocumentsForMatterFromGoogleSheets,
  listAssessmentTemplatesFromGoogleSheets,
  listFirmSampleDocumentsFromGoogleSheets,
  listDeliverableTemplateDocumentsFromGoogleSheets,
  createDocumentInGoogleSheets,
  registerDocumentInGoogleSheets,
} from "./google-sheets/queries";
import {
  isValidLifecycleTransition,
  normalizeLifecycleStage,
  type MatterLifecycleStage,
} from "./matter-lifecycle-stage";
import { stageTaskTemplates } from "./matter-task-templates";
import { emptyCaseAssessment } from "./case-assessment";
import {
  emptyProceduralTimeline,
  parseProceduralTimeline,
  PROCEDURAL_TIMELINE_NOTE_TYPE,
  serializeProceduralTimeline,
  type ProceduralTimelinePayload,
} from "./procedural-timeline";
import {
  emptyDraftingFacts,
  parseDraftingFactsNote,
  serializeDraftingFacts,
  type DraftingFactsPayload,
} from "./practice-area-facts";
import {
  createAssignmentDemo,
  addDocument as addDocumentDemo,
  getMutableSeed,
  listInboxItemsDemo,
  persistSeed,
  updateAssignmentStatusDemo,
  updateAssignmentPaymentDemo,
  markAssignmentDeliveredDemo,
  getInboxItemByIdDemo,
  updateNote as updateNoteDemo,
} from "./demo-store-mutable";
import {
  ASSESSMENT_DOCUMENT_NOTE_TYPE,
  DELIVERABLE_TEMPLATE_NOTE_TYPE,
  encodeAssessmentTemplateCategory,
  encodeDeliverableTemplateCategory,
  encodeFirmSampleCategory,
  FIRM_TEMPLATE_MATTER_ID,
  isAssessmentTemplateDocument,
  isDeliverableTemplateDocument,
  isFirmSampleDocument,
  parseDeliverableTemplateMeta,
  serializeAssessmentOcrPayload,
  serializeDeliverableTemplateMeta,
  type AssessmentOcrPayload,
  type DeliverableTemplateMetaPayload,
  type FirmSampleDocType,
} from "./assessment-documents";
import {
  defaultSourceForDeliverable,
  type DeliverableTemplateCatalogItem,
} from "./deliverable-template-sources";
import { DELIVERABLE_CATALOG } from "./deliverable-catalog";
import { parseTemplateStructure } from "./template-structure";

export type { DeliverableTemplateCatalogItem };
import type {
  AssignmentStatus,
  AssignmentTier,
  CalendarEvent,
  CaseAssessment,
  DevSeed,
  DocumentRow,
  Contact,
  InboxItem,
  LegalElementRow,
  Matter,
  Note,
  Task,
  TimelineEntry,
} from "./types";
import type { NoteWorkEntry } from "./work-entry";

export { isDemoMode, usesGoogleSheets } from "./data-store-config";

let quotaFallbackActive = false;

function mattersBackend() {
  return usesGoogleSheets()
    ? {
        list: listMattersFromGoogleSheets,
        get: getMatterFromGoogleSheets,
        create: createMatterInGoogleSheets,
        ensureFirmTemplate: ensureFirmTemplateMatterInGoogleSheets,
        update: updateMatterInGoogleSheets,
        updateDeadline: updateMatterDeadlineInGoogleSheets,
      }
    : {
        list: listMattersFromAirtable,
        get: getMatterFromAirtable,
        create: createMatterInAirtable,
        ensureFirmTemplate: ensureFirmTemplateMatterInAirtable,
        update: updateMatterInAirtable,
        updateDeadline: updateMatterDeadlineInAirtable,
      };
}

function notesBackend() {
  return usesGoogleSheets()
    ? {
        listAll: listAllNotesFromGoogleSheets,
        listForMatter: listNotesForMatterFromGoogleSheets,
        create: createNoteInGoogleSheets,
        update: updateNoteInGoogleSheets,
        findAgent: findLatestAgentNoteForMatterFromGoogleSheets,
        findProcedural: findLatestProceduralTimelineNoteForMatterFromGoogleSheets,
        findFacts: findLatestDraftingFactsNoteForMatterFromGoogleSheets,
        findAssessmentOcr: findLatestAssessmentOcrNoteForMatterFromGoogleSheets,
      }
    : {
        listAll: listAllNotesFromAirtable,
        listForMatter: listNotesForMatterFromAirtable,
        create: createNoteInAirtable,
        update: updateNoteInAirtable,
        findAgent: findLatestAgentNoteForMatter,
        findProcedural: findLatestProceduralTimelineNoteForMatter,
        findFacts: findLatestDraftingFactsNoteForMatter,
        findAssessmentOcr: findLatestAssessmentOcrNoteForMatter,
      };
}

function tasksBackend() {
  return usesGoogleSheets()
    ? {
        listForMatter: listTasksForMatterFromGoogleSheets,
        listAll: listAllTasksFromGoogleSheets,
        create: createTaskInGoogleSheets,
        complete: completeTaskInGoogleSheets,
        update: updateTaskInGoogleSheets,
      }
    : {
        listForMatter: listTasksForMatterFromAirtable,
        listAll: listAllTasksFromAirtable,
        create: createTaskInAirtable,
        complete: completeTaskInAirtable,
        update: updateTaskInAirtable,
      };
}

function contactsBackend() {
  return usesGoogleSheets()
    ? {
        list: listContactsFromGoogleSheets,
        get: getContactFromGoogleSheets,
        listForMatter: listContactsForMatterFromGoogleSheets,
        create: createContactInGoogleSheets,
        link: linkContactToMatterInGoogleSheets,
        unlink: unlinkContactFromMatterInGoogleSheets,
      }
    : {
        list: listContactsFromAirtable,
        get: getContactFromAirtable,
        listForMatter: listContactsForMatterFromAirtable,
        create: createContactInAirtable,
        link: linkContactToMatterInAirtable,
        unlink: unlinkContactFromMatterInAirtable,
      };
}

function legalElementsBackend() {
  return usesGoogleSheets()
    ? {
        listForMatter: listLegalElementsFromGoogleSheets,
        create: createLegalElementInGoogleSheets,
        update: updateLegalElementInGoogleSheets,
      }
    : {
        listForMatter: listLegalElementsFromAirtable,
        create: createLegalElementInAirtable,
        update: updateLegalElementInAirtable,
      };
}

function eventsBackend() {
  return usesGoogleSheets()
    ? {
        listForMatter: listEventsForMatterFromGoogleSheets,
        listAll: listEventsFromGoogleSheets,
        create: createEventInGoogleSheets,
      }
    : {
        listForMatter: listEventsForMatterFromAirtable,
        listAll: listEventsFromAirtable,
        create: createEventInAirtable,
      };
}

function documentsBackend() {
  return usesGoogleSheets()
    ? {
        listForMatter: listDocumentsForMatterFromGoogleSheets,
        listAssessmentTemplates: listAssessmentTemplatesFromGoogleSheets,
        listFirmSamples: listFirmSampleDocumentsFromGoogleSheets,
        listDeliverableTemplates: listDeliverableTemplateDocumentsFromGoogleSheets,
        create: createDocumentInGoogleSheets,
        register: registerDocumentInGoogleSheets,
      }
    : {
        listForMatter: listDocumentsFromAirtable,
        listAssessmentTemplates: listAssessmentTemplatesFromAirtable,
        listFirmSamples: listFirmSampleDocumentsFromAirtable,
        listDeliverableTemplates: listDeliverableTemplateDocumentsFromAirtable,
        create: async (
          matterId: string,
          payload: {
            title: string;
            category: string;
            documentId?: string;
            uploadedBy?: string;
            ocrStatus?: string;
            piiTier?: string;
            fileType?: string;
          },
        ) =>
          registerAssessmentDocumentInAirtable(matterId, {
            title: payload.title,
            category: payload.category,
            airtableDocumentId: payload.documentId,
          }),
        register: async (
          matterId: string,
          payload: {
            title: string;
            category: string;
            documentId?: string;
            uploadedBy?: string;
            ocrStatus?: string;
            piiTier?: string;
            fileType?: string;
          },
        ) =>
          registerAssessmentDocumentInAirtable(matterId, {
            title: payload.title,
            category: payload.category,
            airtableDocumentId: payload.documentId,
          }),
      };
}

function inboxBackend() {
  return usesGoogleSheets()
    ? {
        list: listInboxItemsFromGoogleSheets,
        getById: getInboxItemByIdFromGoogleSheets,
        createAssignment: createAssignmentInGoogleSheets,
        updateStatus: updateAssignmentStatusInGoogleSheets,
        updatePayment: updateAssignmentPaymentInGoogleSheets,
        markDelivered: markAssignmentDeliveredInGoogleSheets,
        resolve: resolveInboxItemInGoogleSheets,
      }
    : {
        list: listInboxItemsFromAirtable,
        getById: getInboxItemByIdFromAirtable,
        createAssignment: createAssignmentInAirtable,
        updateStatus: updateAssignmentStatusInAirtable,
        updatePayment: updateAssignmentPaymentInAirtable,
        markDelivered: markAssignmentDeliveredInAirtable,
        resolve: resolveInboxItemInAirtable,
      };
}

export function isQuotaFallbackMode(): boolean {
  return quotaFallbackActive;
}

/** Demo mode or full Airtable-only quota fallback — UI shows sample-data messaging. */
export function isSampleDataMode(): boolean {
  return isDemoMode() || (quotaFallbackActive && !usesGoogleSheets());
}

/** Google Sheets primary but legacy Airtable tables unavailable (quota or not migrated). */
export function isAirtableDegradedMode(): boolean {
  return quotaFallbackActive && usesGoogleSheets();
}

async function loadDemoSeed(): Promise<DevSeed> {
  return getMutableSeed();
}

async function withSampleFallback<T>(
  demoFn: () => Promise<T>,
  liveFn: () => Promise<T>,
): Promise<T> {
  try {
    return await liveFn();
  } catch (error) {
    if (isAirtableQuotaError(error)) {
      quotaFallbackActive = true;
      console.warn("[AOD] Airtable quota exceeded — serving bundled sample data.");
      return demoFn();
    }
    throw error;
  }
}

/** Matters / Notes / Tasks — primary backend (Google Sheets or Airtable). */
async function readPrimary<T>(
  demoFn: () => Promise<T>,
  liveFn: () => Promise<T>,
  degradedFallback?: T,
): Promise<T> {
  if (isDemoMode()) return demoFn();
  try {
    return await liveFn();
  } catch (error) {
    if (isAirtableQuotaError(error)) {
      quotaFallbackActive = true;
      console.warn("[AOD] Airtable quota exceeded — serving bundled sample data.");
      return demoFn();
    }
    if (usesGoogleSheets() && isGoogleSheetsReadError(error)) {
      quotaFallbackActive = true;
      console.warn("[AOD] Google Sheets read failed — degraded mode.");
      if (degradedFallback !== undefined) return degradedFallback;
      return demoFn();
    }
    throw error;
  }
}

export async function listMatters(): Promise<Matter[]> {
  const backend = mattersBackend();
  return readPrimary(
    async () => (await loadDemoSeed()).matters,
    () => backend.list(),
    [],
  );
}

export async function listContacts(): Promise<Contact[]> {
  return readPrimary(
    async () => (await loadDemoSeed()).contacts ?? [],
    () => contactsBackend().list(),
    [],
  );
}

export async function getContact(contactId: string): Promise<Contact | null> {
  return readPrimary(
    async () => {
      const contacts = (await loadDemoSeed()).contacts ?? [];
      return contacts.find((c) => c.id === contactId) ?? null;
    },
    () => contactsBackend().get(contactId),
    null,
  );
}

export async function listContactsForMatter(matterId: string): Promise<Contact[]> {
  return readPrimary(
    async () => {
      const contacts = (await loadDemoSeed()).contacts ?? [];
      return contacts.filter((c) => c.linkedMatterIds.includes(matterId));
    },
    () => contactsBackend().listForMatter(matterId),
    [],
  );
}

export async function createContact(payload: {
  displayName: string;
  role?: string;
  email?: string;
  phone?: string;
  organization?: string;
  notes?: string;
  matterCode?: string;
}): Promise<Contact> {
  const displayName = payload.displayName.trim();
  if (!displayName) throw new Error("displayName is required");

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    if (!seed.contacts) seed.contacts = [];
    const contact: Contact = {
      id: `recContact${Date.now()}`,
      displayName,
      role: payload.role ?? "Client",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      organization: payload.organization ?? "",
      notes: payload.notes ?? "",
      linkedMatterIds: payload.matterCode ? [payload.matterCode] : [],
    };
    seed.contacts.push(contact);
    await persistSeed();
    return contact;
  }
  return contactsBackend().create({ ...payload, displayName });
}

export async function linkContactToMatter(
  contactId: string,
  matterCode: string,
): Promise<Contact> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const contact = (seed.contacts ?? []).find((c) => c.id === contactId);
    if (!contact) throw new Error("Contact not found");
    if (!contact.linkedMatterIds.includes(matterCode)) {
      contact.linkedMatterIds.push(matterCode);
      await persistSeed();
    }
    return contact;
  }
  return contactsBackend().link(contactId, matterCode);
}

export async function unlinkContactFromMatter(
  contactId: string,
  matterCode: string,
): Promise<Contact> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const contact = (seed.contacts ?? []).find((c) => c.id === contactId);
    if (!contact) throw new Error("Contact not found");
    contact.linkedMatterIds = contact.linkedMatterIds.filter((id) => id !== matterCode);
    await persistSeed();
    return contact;
  }
  return contactsBackend().unlink(contactId, matterCode);
}

export async function createMatter(payload: {
  title: string;
  caseType: string;
  country?: string;
  posture?: string;
  status?: string;
  summary?: string;
}): Promise<Matter> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matterId = `AOD-${1000 + seed.matters.length + 1}`;
    const matter: Matter = {
      id: `rec-demo-${Date.now()}`,
      matterId,
      clientName: payload.title,
      title: payload.title,
      caseType: payload.caseType,
      country: payload.country,
      posture: payload.posture,
      status: payload.status ?? "Open",
      proceduralPosture: payload.posture ?? "",
      fidelityScore: 0,
      nextDeadline: null,
      vulnerabilityFlags: [],
      assignedAttorney: "",
      summary: payload.summary ?? "",
    };
    seed.matters.push(matter);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return matter;
  }
  return mattersBackend().create(payload);
}

/** Closed administrative matter for firm-wide templates (demo + Airtable). */
export async function ensureFirmTemplateMatter(): Promise<Matter> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.matters.find(
      (m) => m.matterId === FIRM_TEMPLATE_MATTER_ID || m.id === FIRM_TEMPLATE_MATTER_ID,
    );
    if (existing) return existing;
    const matter: Matter = {
      id: "recFirmTemplates",
      matterId: FIRM_TEMPLATE_MATTER_ID,
      clientName: "Firm Templates",
      title: "Firm Templates",
      caseType: "Other",
      status: "Closed",
      proceduralPosture: "",
      fidelityScore: 0,
      nextDeadline: null,
      vulnerabilityFlags: [],
      assignedAttorney: "",
      summary:
        "Administrative matter for firm-wide deliverable templates and assessment forms. Not an active client case.",
    };
    seed.matters.push(matter);
    await persistSeed();
    return matter;
  }
  const resolved = await mattersBackend().ensureFirmTemplate();
  return (
    (await getMatterByCode(resolved.matterId)) ?? {
      id: resolved.recordId,
      matterId: resolved.matterId,
      clientName: "Firm Templates",
      title: "Firm Templates",
      caseType: "Other",
      status: "Closed",
      proceduralPosture: "",
      fidelityScore: 0,
      nextDeadline: null,
      vulnerabilityFlags: [],
      assignedAttorney: "",
      summary: "",
    }
  );
}

export async function getMatterByCode(matterId: string): Promise<Matter | null> {
  return readPrimary(
    async () => {
      const matters = (await loadDemoSeed()).matters;
      return matters.find((m) => m.matterId === matterId || m.id === matterId) ?? null;
    },
    () => mattersBackend().get(matterId),
  );
}

export async function listTasksForMatter(matterId: string): Promise<Task[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.tasks.filter((t) => t.matterId === matterId);
    },
    () => tasksBackend().listForMatter(matterId),
  );
}

export async function listAllTasks(): Promise<Task[]> {
  return readPrimary(
    async () => (await loadDemoSeed()).tasks,
    () => tasksBackend().listAll(),
  );
}

export async function listAllNotes(): Promise<Note[]> {
  return readPrimary(
    async () => (await loadDemoSeed()).notes,
    () => notesBackend().listAll(),
  );
}

export async function listNotesForMatter(matterId: string): Promise<Note[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.notes.filter((n) => n.matterId === matterId);
    },
    () => notesBackend().listForMatter(matterId),
  );
}

export async function listLegalElements(matterId: string): Promise<LegalElementRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.legalElements.filter((e) => e.matterId === matterId);
    },
    () => legalElementsBackend().listForMatter(matterId),
    [],
  );
}

export async function listEventsForMatter(matterId: string) {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.events.filter((e) => e.matterId === matterId);
    },
    () => eventsBackend().listForMatter(matterId),
    [],
  );
}

export type CalendarEventRow = Awaited<ReturnType<typeof listEventsFromAirtable>>[number];

/** All firm calendar events (Calendar page). */
export async function listAllEvents(): Promise<CalendarEventRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.events.map((e) => ({
        id: e.id,
        matterId: e.matterId,
        type: e.type,
        date: e.date,
        description: e.description,
        time: "",
        location: "",
        longDescription: e.description,
        calendarSynced: false,
      }));
    },
    () => eventsBackend().listAll(),
    [],
  );
}

export async function createEvent(payload: {
  summary: string;
  matterCode?: string;
  type: string;
  date: string;
  time?: string;
  description?: string;
  location?: string;
}): Promise<CalendarEvent> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const event: CalendarEvent = {
      id: `evt-${Date.now()}`,
      matterId: payload.matterCode ?? "",
      type: payload.type,
      date: payload.date,
      description: payload.summary,
    };
    seed.events.push(event);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return event;
  }
  return eventsBackend().create(payload);
}

export async function listDocumentsForMatter(matterId: string): Promise<DocumentRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.documents.filter(
        (d) =>
          d.matterId === matterId &&
          !isAssessmentTemplateDocument(d) &&
          !isFirmSampleDocument(d) &&
          !isDeliverableTemplateDocument(d),
      );
    },
    async () => {
      const docs = await documentsBackend().listForMatter(matterId);
      return docs.filter(
        (d) =>
          !isAssessmentTemplateDocument(d) &&
          !isFirmSampleDocument(d) &&
          !isDeliverableTemplateDocument(d),
      );
    },
    [],
  );
}

/** Register document metadata (assessment, template, or supporting upload). */
export async function createDocumentForMatter(
  matterId: string,
  payload: {
    title: string;
    category: string;
    documentId?: string;
    uploadedBy?: string;
    ocrStatus?: string;
    piiTier?: string;
    fileType?: string;
  },
): Promise<DocumentRow> {
  if (isDemoMode()) {
    return addDocumentDemo(matterId, {
      title: payload.title,
      category: payload.category,
      ocrStatus: payload.ocrStatus,
      fileType: payload.fileType,
      id: payload.documentId,
    });
  }
  return documentsBackend().register(matterId, payload);
}

export async function getCaseAssessment(matterId: string): Promise<CaseAssessment> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      const stored = seed.caseAssessments?.find((c) => c.matterId === matterId);
      return stored ?? emptyCaseAssessment(matterId);
    },
    () =>
      usesGoogleSheets()
        ? getCaseAssessmentFromGoogleSheets(matterId)
        : getCaseAssessmentFromAirtable(matterId),
    emptyCaseAssessment(matterId),
  );
}

export async function saveCaseAssessment(matterId: string, assessment: CaseAssessment): Promise<CaseAssessment> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    if (!seed.caseAssessments) seed.caseAssessments = [];
    const idx = seed.caseAssessments.findIndex((c) => c.matterId === matterId);
    const payload = { ...assessment, matterId };
    if (idx >= 0) seed.caseAssessments[idx] = payload;
    else seed.caseAssessments.push(payload);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return payload;
  }
  return usesGoogleSheets()
    ? saveCaseAssessmentInGoogleSheets(matterId, assessment)
    : saveCaseAssessmentInAirtable(matterId, assessment);
}

export async function createLegalElement(
  matterId: string,
  elementName: string,
): Promise<LegalElementRow> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const row: LegalElementRow = {
      id: `le-${Date.now()}`,
      matterId,
      element: elementName,
      assessment: "Not assessed",
      keyGap: "",
      nextAction: "",
    };
    seed.legalElements.push(row);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return row;
  }
  return legalElementsBackend().create(matterId, elementName);
}

export async function updateLegalElementRow(
  id: string,
  patch: Partial<
    Pick<LegalElementRow, "assessment" | "keyGap" | "nextAction" | "supportingFacts" | "supportingCases">
  >,
): Promise<LegalElementRow | null> {
  if (isDemoMode()) {
    const { updateLegalElement } = await import("./demo-store-mutable");
    return updateLegalElement(id, patch);
  }
  return legalElementsBackend().update(id, patch);
}

export async function completeTask(
  taskId: string,
  options?: { completionDocs?: string; completionNote?: string; completedBy?: string },
): Promise<Task | null> {
  if (isDemoMode()) {
    const { completeTask: completeDemoTask } = await import("./demo-store-mutable");
    return completeDemoTask(taskId);
  }
  const task = await tasksBackend().complete(taskId, options);
  if (!task) return null;
  const when = new Date().toISOString();
  const docs = options?.completionDocs?.trim() || "(not specified)";
  const note = options?.completionNote?.trim();
  const body = note
    ? `Task completed: ${task.description}. By: ${options?.completedBy ?? "Attorney"}. Date: ${when}. Documents: ${docs}. Note: ${note}`
    : `Task completed: ${task.description}. By: ${options?.completedBy ?? "Attorney"}. Date: ${when}. Documents: ${docs}.`;
  await notesBackend().create(task.matterId, body, "System", "Manual");
  return task;
}

export async function updateTaskForMatter(
  taskId: string,
  patch: Partial<Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline">>,
): Promise<Task | null> {
  if (isDemoMode()) {
    const { updateTask: updateDemoTask } = await import("./demo-store-mutable");
    return updateDemoTask(taskId, patch);
  }
  return tasksBackend().update(taskId, patch);
}

export async function createTaskForMatter(
  matterId: string,
  payload: Pick<Task, "description" | "dueDate" | "priority" | "isFilingDeadline"> & {
    /** Stable template tag (e.g. "stage:Active:imm-medical") for automated, idempotent creation. */
    createdFrom?: string;
  },
): Promise<Task> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const task: Task = {
      id: `tsk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      matterId,
      description: payload.description,
      dueDate: payload.dueDate,
      status: "To Do",
      priority: payload.priority,
      isFilingDeadline: payload.isFilingDeadline,
      createdFrom: payload.createdFrom,
    };
    seed.tasks.push(task);
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return task;
  }
  return tasksBackend().create(matterId, payload);
}

export async function createNoteForMatter(
  matterId: string,
  content: string,
  author: string,
  type = "Manual",
  work?: NoteWorkEntry | null,
): Promise<Note> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note: Note = {
      id: `note-${Date.now()}`,
      matterId,
      author,
      content,
      createdAt: new Date().toISOString(),
      type,
      ...(work
        ? { activity: work.activity, minutes: work.minutes, billable: work.billable }
        : {}),
    };
    seed.notes.push(note);
    await persistSeed();
    return note;
  }
  return notesBackend().create(matterId, content, author, type, work ?? null);
}

export async function getDraftingFactsForMatter(matterId: string): Promise<DraftingFactsPayload | null> {
  const matter = await getMatterByCode(matterId);
  const caseType = matter?.caseType ?? "";
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Facts")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!note) return null;
    return parseDraftingFactsNote(note.content, matterId, caseType);
  }
  try {
    const note = await notesBackend().findFacts(matterId);
    if (!note) return null;
    return parseDraftingFactsNote(note.content, matterId, caseType);
  } catch (error) {
    console.warn(`[AOD] drafting facts read failed for ${matterId}:`, error);
    return null;
  }
}

export async function saveDraftingFactsForMatter(
  matterId: string,
  payload: DraftingFactsPayload,
): Promise<DraftingFactsPayload> {
  const matter = await getMatterByCode(matterId);
  if (!matter) throw new Error(`Matter not found: ${matterId}`);
  const normalized: DraftingFactsPayload = {
    ...payload,
    v: 1,
    caseType: matter.caseType,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeDraftingFacts(normalized);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Facts")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = "Attorney";
      return normalized;
    }
    seed.notes.push({
      id: `note-${Date.now()}`,
      matterId,
      author: "Attorney",
      content,
      createdAt: new Date().toISOString(),
      type: "Facts",
    });
    return normalized;
  }

  const nb = notesBackend();
  const existing = await nb.findFacts(matterId);
  if (existing) {
    await nb.update(existing.id, matterId, content, "Attorney");
  } else {
    await nb.create(matterId, content, "Attorney", "Facts");
  }
  return normalized;
}

export async function getProceduralTimelineForMatter(
  matterId: string,
): Promise<ProceduralTimelinePayload> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes
      .filter((n) => n.matterId === matterId && n.type === PROCEDURAL_TIMELINE_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!note) return emptyProceduralTimeline(matterId);
    return parseProceduralTimeline(note.content, matterId) ?? emptyProceduralTimeline(matterId);
  }
  try {
    const note = await notesBackend().findProcedural(matterId);
    if (!note) return emptyProceduralTimeline(matterId);
    return parseProceduralTimeline(note.content, matterId) ?? emptyProceduralTimeline(matterId);
  } catch (error) {
    console.warn(`[AOD] procedural timeline read failed for ${matterId}:`, error);
    return emptyProceduralTimeline(matterId);
  }
}

export async function saveProceduralTimelineForMatter(
  matterId: string,
  payload: ProceduralTimelinePayload,
): Promise<ProceduralTimelinePayload> {
  const matter = await getMatterByCode(matterId);
  if (!matter) throw new Error(`Matter not found: ${matterId}`);
  const normalized: ProceduralTimelinePayload = {
    ...payload,
    v: 1,
    matterId,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeProceduralTimeline(normalized);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === PROCEDURAL_TIMELINE_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = "Attorney";
      return normalized;
    }
    seed.notes.push({
      id: `note-${Date.now()}`,
      matterId,
      author: "Attorney",
      content,
      createdAt: new Date().toISOString(),
      type: PROCEDURAL_TIMELINE_NOTE_TYPE,
    });
    return normalized;
  }

  const nb = notesBackend();
  const existing = await nb.findProcedural(matterId);
  if (existing) {
    await nb.update(existing.id, matterId, content, "Attorney");
  } else {
    await nb.create(matterId, content, "Attorney", PROCEDURAL_TIMELINE_NOTE_TYPE);
  }
  return normalized;
}

export async function updateNoteForMatter(
  matterId: string,
  noteId: string,
  content: string,
  author?: string,
): Promise<Note | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const note = seed.notes.find((n) => n.id === noteId && n.matterId === matterId);
    if (!note) return null;
    note.content = content;
    if (author) note.author = author;
    return note;
  }
  try {
    return await notesBackend().update(noteId, matterId, content, author);
  } catch {
    return null;
  }
}

/** Upsert the latest agent work product on a matter (Notes table, type Agent). */
export async function upsertAgentOutputForMatter(
  matterId: string,
  content: string,
  options?: { noteId?: string; agent?: string },
): Promise<Note> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("content required");

  if (isDemoMode()) {
    if (options?.noteId) {
      const updated = await updateNoteDemo(options.noteId, trimmed, "Attorney (edited)");
      if (updated) return updated;
    }
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === "Agent")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = trimmed;
      existing.author = "Attorney (edited)";
      return existing;
    }
    const note: Note = {
      id: `note-${Date.now()}`,
      matterId,
      author: options?.agent ?? "Litigation Associate",
      content: trimmed,
      createdAt: new Date().toISOString(),
      type: "Agent",
    };
    seed.notes.push(note);
    return note;
  }

  const nb = notesBackend();
  if (options?.noteId) {
    const updated = await nb.update(options.noteId, matterId, trimmed, "Attorney (edited)");
    return updated;
  }
  const latest = await nb.findAgent(matterId);
  if (latest) {
    return nb.update(latest.id, matterId, trimmed, "Attorney (edited)");
  }
  const label = options?.agent ? `[${options.agent} — edited output]` : "[Agent output — edited]";
  return nb.create(matterId, `${label}\n\n${trimmed}`, options?.agent ?? "Litigation Associate", "Agent");
}

export async function updateMatterFields(
  matterId: string,
  patch: Parameters<typeof updateMatterInAirtable>[1],
): Promise<Matter | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matter = seed.matters.find((m) => m.matterId === matterId);
    if (!matter) return null;
    Object.assign(matter, patch);
    return matter;
  }
  return mattersBackend().update(matterId, patch);
}

export async function updateMatterDeadline(matterId: string, nextDeadline: string | null): Promise<Matter | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matter = seed.matters.find((m) => m.matterId === matterId);
    if (!matter) return null;
    matter.nextDeadline = nextDeadline;
    return matter;
  }
  return mattersBackend().updateDeadline(matterId, nextDeadline);
}

/**
 * Matter lifecycle stage transition (Google Sheets only — see
 * `matter-lifecycle-stage.ts`). Throws on an illegal transition or when
 * neither demo mode nor Google Sheets is active, mirroring
 * `updateAssignmentStatus`'s error-on-illegal-move contract; the API route
 * maps the thrown message to a 400/404/409.
 */
export async function updateMatterLifecycleStage(
  matterId: string,
  nextStage: MatterLifecycleStage,
): Promise<Matter> {
  if (!isDemoMode() && !usesGoogleSheets()) {
    throw new Error(
      "Lifecycle stages require Google Sheets. Connect Google Sheets in Settings to use this feature.",
    );
  }
  const matter = await getMatterByCode(matterId);
  if (!matter) throw new Error("Matter not found.");
  const current = normalizeLifecycleStage(matter.lifecycleStage);
  if (!isValidLifecycleTransition(current, nextStage)) {
    throw new Error(`Cannot move matter from "${current}" to "${nextStage}".`);
  }
  if (isDemoMode()) {
    const { updateMatterLifecycleStageDemo } = await import("./demo-store-mutable");
    const updated = await updateMatterLifecycleStageDemo(matterId, nextStage);
    if (!updated) throw new Error("Matter not found.");
    return updated;
  }
  const updated = await updateMatterInGoogleSheets(matterId, { lifecycleStage: nextStage });
  if (!updated) throw new Error("Matter not found.");
  return updated;
}

/** Shared by `advanceMatterStageWithTasks` and `seedInitialLifecycleTasks` — bulk-creates a stage's task checklist, tagged for idempotency. */
async function createStageTaskChecklist(
  matterId: string,
  caseType: string,
  stage: MatterLifecycleStage,
): Promise<number> {
  const templates = stageTaskTemplates(caseType, stage);
  const existing = await listTasksForMatter(matterId);
  const existingTags = new Set(existing.map((t) => t.createdFrom).filter(Boolean));

  let tasksCreated = 0;
  for (const template of templates) {
    const tag = `stage:${stage}:${template.id}`;
    if (existingTags.has(tag)) continue;
    await createTaskForMatter(matterId, {
      description: template.description,
      dueDate: null,
      priority: template.priority,
      isFilingDeadline: template.isFilingDeadline ?? false,
      createdFrom: tag,
    });
    tasksCreated += 1;
  }
  return tasksCreated;
}

/**
 * Transition + bulk-create that stage's task checklist, tagged for
 * idempotency. Shared by the manual `PATCH /api/matters/[id]/stage` route
 * and the automatic triggers below (assignment created, deliverable
 * exported, matter closed/reopened) so both paths behave identically.
 */
export async function advanceMatterStageWithTasks(
  matterId: string,
  nextStage: MatterLifecycleStage,
): Promise<{ matter: Matter; tasksCreated: number }> {
  const matter = await updateMatterLifecycleStage(matterId, nextStage);
  const tasksCreated = await createStageTaskChecklist(matterId, matter.caseType, nextStage);
  return { matter, tasksCreated };
}

/**
 * Seed the Intake checklist on a brand-new matter. Nothing ever
 * "transitions into" Intake (it's the default starting stage), so this is
 * the one case that isn't covered by `advanceMatterStageWithTasks`. Same
 * best-effort contract as `autoAdvanceMatterLifecycleStage`.
 */
export async function seedInitialLifecycleTasks(matterId: string, caseType: string): Promise<void> {
  if (!isDemoMode() && !usesGoogleSheets()) return;
  try {
    await createStageTaskChecklist(matterId, caseType, "Intake");
  } catch (err) {
    console.warn(`[AOD] seed initial lifecycle tasks failed for ${matterId}:`, err);
  }
}

/**
 * Best-effort automatic stage advance for real system events (assignment
 * created, deliverable exported). Only moves if the matter is currently in
 * exactly `fromStage` — so it's naturally a one-time, idempotent nudge, not
 * a forced jump — and never throws, since these fire as side effects of an
 * unrelated primary action that must not fail because of this.
 */
export async function autoAdvanceMatterLifecycleStage(
  matterId: string,
  fromStage: MatterLifecycleStage,
  toStage: MatterLifecycleStage,
): Promise<void> {
  if (!isDemoMode() && !usesGoogleSheets()) return;
  try {
    const matter = await getMatterByCode(matterId);
    if (!matter) return;
    if (normalizeLifecycleStage(matter.lifecycleStage) !== fromStage) return;
    await advanceMatterStageWithTasks(matterId, toStage);
  } catch (err) {
    console.warn(`[AOD] auto-advance lifecycle stage failed for ${matterId}:`, err);
  }
}

/**
 * Force-set the lifecycle stage without transition validation — used only
 * when an attorney explicitly closes a matter (any stage can close). Best
 * effort, same as `autoAdvanceMatterLifecycleStage`.
 */
export async function forceMatterLifecycleStage(
  matterId: string,
  stage: MatterLifecycleStage,
): Promise<void> {
  if (!isDemoMode() && !usesGoogleSheets()) return;
  try {
    if (isDemoMode()) {
      const { updateMatterLifecycleStageDemo } = await import("./demo-store-mutable");
      await updateMatterLifecycleStageDemo(matterId, stage);
      return;
    }
    await updateMatterInGoogleSheets(matterId, { lifecycleStage: stage });
  } catch (err) {
    console.warn(`[AOD] force lifecycle stage failed for ${matterId}:`, err);
  }
}

const OPEN_INBOX_STATUSES = new Set(["Pending", "Submitted", "In progress", "Ready for review", "Returned"]);

export async function listInboxItems(): Promise<InboxItem[]> {
  if (isDemoMode()) return listInboxItemsDemo();
  return readPrimary(
    () => listInboxItemsDemo(),
    () => inboxBackend().list(),
    [],
  );
}

export async function countUnreadInbox(): Promise<number> {
  const items = await listInboxItems();
  return items.filter((item) => OPEN_INBOX_STATUSES.has(item.status)).length;
}

export async function countSubmittedAssignments(): Promise<number> {
  const items = await listInboxItems();
  return items.filter((item) => item.kind === "assignment" && item.status === "Submitted").length;
}

export async function createAssignment(payload: {
  matterId: string;
  deliverableType: string;
  tier: AssignmentTier;
  facts: string;
  priority?: string;
  dueDate?: string | null;
  submittedBy?: string;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  source?: "internal" | "partner";
  partnerEmail?: string;
  partnerFirmName?: string;
}): Promise<InboxItem> {
  if (isDemoMode()) return createAssignmentDemo(payload);
  return inboxBackend().createAssignment({ matterCode: payload.matterId, ...payload });
}

export async function getInboxItemById(itemId: string): Promise<InboxItem | null> {
  if (isDemoMode()) return getInboxItemByIdDemo(itemId);
  return readPrimary(
    () => getInboxItemByIdDemo(itemId),
    () => inboxBackend().getById(itemId),
    null,
  );
}

export async function resolveInboxItem(
  itemId: string,
  resolution: string,
  status: "Resolved" | "Dismissed" = "Resolved",
): Promise<InboxItem> {
  if (isDemoMode()) {
    throw new Error("Demo mode — resolve inbox item via demo UI only.");
  }
  return inboxBackend().resolve(itemId, resolution, status);
}

export async function updateAssignmentPayment(
  itemId: string,
  patch: {
    paymentStatus?: "pending" | "paid" | "invoice";
    stripeSessionId?: string;
    amountCents?: number;
  },
): Promise<InboxItem | null> {
  if (isDemoMode()) return updateAssignmentPaymentDemo(itemId, patch);
  return inboxBackend().updatePayment(itemId, patch);
}

export async function updateAssignmentStatus(
  itemId: string,
  nextStatus: AssignmentStatus,
  options?: { note?: string; by?: string },
): Promise<InboxItem | null> {
  if (isDemoMode()) return updateAssignmentStatusDemo(itemId, nextStatus, options);
  return inboxBackend().updateStatus(itemId, nextStatus, options);
}

export async function markAssignmentDelivered(
  itemId: string,
  options?: { exportKind?: string; by?: string },
): Promise<InboxItem | null> {
  if (isDemoMode()) return markAssignmentDeliveredDemo(itemId, options);
  return inboxBackend().markDelivered(itemId, options);
}

/** Assignment-kind PM Inbox rows linked to a matter code (e.g. AOD-1001). */
export async function listAssignmentsForMatter(matterId: string): Promise<InboxItem[]> {
  const items = await listInboxItems();
  return items
    .filter((item) => item.kind === "assignment" && item.matterId === matterId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Agent-flag PM Inbox rows (gaps, MANUAL FLAG) linked to a matter code. */
export async function listAgentAlertsForMatter(matterId: string): Promise<InboxItem[]> {
  const items = await listInboxItems();
  return items
    .filter((item) => item.kind !== "assignment" && item.matterId === matterId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function buildTimeline(matterId: string): Promise<TimelineEntry[]> {
  const seed = isDemoMode() ? await loadDemoSeed() : null;
  const entries: TimelineEntry[] = [];

  const notes = seed ? seed.notes.filter((n) => n.matterId === matterId) : await listNotesForMatter(matterId);
  for (const n of notes) {
    entries.push({
      id: n.id,
      matterId,
      timestamp: n.createdAt,
      actor: n.author,
      kind: "note",
      summary: n.content.slice(0, 120),
    });
  }

  const tasks = seed ? seed.tasks.filter((t) => t.matterId === matterId) : await listTasksForMatter(matterId);
  for (const t of tasks) {
    entries.push({
      id: `${t.id}-created`,
      matterId,
      timestamp: t.dueDate ?? new Date().toISOString(),
      actor: "System",
      kind: "task_created",
      summary: `Task: ${t.description}`,
    });
    if (t.status === "Done") {
      entries.push({
        id: `${t.id}-done`,
        matterId,
        timestamp: t.dueDate ?? new Date().toISOString(),
        actor: "Attorney",
        kind: "task_completed",
        summary: `Completed: ${t.description}`,
      });
    }
  }

  if (seed) {
    for (const d of seed.documents.filter((x) => x.matterId === matterId)) {
      entries.push({
        id: d.id,
        matterId,
        timestamp: d.uploadedAt,
        actor: "Upload",
        kind: "document",
        summary: d.title,
      });
    }
    for (const e of seed.events.filter((x) => x.matterId === matterId)) {
      entries.push({
        id: e.id,
        matterId,
        timestamp: e.date,
        actor: "Calendar",
        kind: "event",
        summary: e.description,
      });
    }
    for (const a of (seed.auditLog ?? []).filter((x) => x.matterId === matterId)) {
      entries.push({
        id: a.id,
        matterId,
        timestamp: a.timestamp,
        actor: a.actor,
        kind: "agent",
        summary: a.summary,
      });
    }
  } else {
    const documents = await listDocumentsForMatter(matterId);
    for (const d of documents) {
      entries.push({
        id: d.id,
        matterId,
        timestamp: d.uploadedAt,
        actor: d.uploadedBy || "Upload",
        kind: "document",
        summary: d.title,
      });
    }
    const events = await listEventsForMatter(matterId);
    for (const e of events) {
      entries.push({
        id: e.id,
        matterId,
        timestamp: e.date,
        actor: "Calendar",
        kind: "event",
        summary: e.description,
      });
    }
  }

  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export async function registerAssessmentDocument(
  matterId: string,
  payload: {
    title: string;
    category: string;
    airtableDocumentId?: string;
    ocrStatus?: string;
    fileType?: string;
  },
): Promise<DocumentRow> {
  if (isDemoMode()) {
    return addDocumentDemo(matterId, {
      title: payload.title,
      category: payload.category,
      ocrStatus: payload.ocrStatus,
      fileType: payload.fileType,
      id: payload.airtableDocumentId,
    });
  }
  return documentsBackend().register(matterId, {
    title: payload.title,
    category: payload.category,
    documentId: payload.airtableDocumentId,
    ocrStatus: payload.ocrStatus,
    fileType: payload.fileType,
  });
}

export async function listAssessmentTemplates(): Promise<DocumentRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.documents.filter(
        (d) => d.matterId === FIRM_TEMPLATE_MATTER_ID || isAssessmentTemplateDocument(d),
      );
    },
    () => documentsBackend().listAssessmentTemplates(),
    [],
  );
}

export async function saveAssessmentTemplate(payload: {
  title: string;
  practiceArea: string;
  airtableDocumentId?: string;
}): Promise<DocumentRow> {
  await ensureFirmTemplateMatter();
  const category = encodeAssessmentTemplateCategory(payload.practiceArea);
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existingIdx = seed.documents.findIndex(
      (d) =>
        (d.matterId === FIRM_TEMPLATE_MATTER_ID || isAssessmentTemplateDocument(d)) &&
        d.category === category,
    );
    const doc = await addDocumentDemo(FIRM_TEMPLATE_MATTER_ID, {
      title: payload.title,
      category,
      id: payload.airtableDocumentId,
    });
    if (existingIdx >= 0) seed.documents[existingIdx] = doc;
    await persistSeed();
    return doc;
  }
  return documentsBackend().register(FIRM_TEMPLATE_MATTER_ID, {
    title: payload.title,
    category,
    documentId: payload.airtableDocumentId,
  });
}

export type FirmMemoryStatus = {
  templateCount: number;
  sampleCount: number;
  stylePreferenceCount: number;
  configured: boolean;
};

export async function listFirmSamples(): Promise<DocumentRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.documents.filter(
        (d) => d.matterId === FIRM_TEMPLATE_MATTER_ID || isFirmSampleDocument(d),
      );
    },
    () => documentsBackend().listFirmSamples(),
    [],
  );
}

export async function getFirmMemoryStatus(): Promise<FirmMemoryStatus> {
  const templates = await listAssessmentTemplates();
  const samples = await listFirmSamples();
  const templateCount = templates.length;
  const sampleCount = samples.length;
  const stylePreferenceCount =
    isDemoMode() || usesGoogleSheets()
      ? 0
      : await withSampleFallback(
          async () => 0,
          () => countFirmMemoryPatternsFromAirtable(),
        );
  const configured = templateCount > 0 || sampleCount > 0 || stylePreferenceCount > 0;
  return { templateCount, sampleCount, stylePreferenceCount, configured };
}

export async function saveFirmSample(payload: {
  title: string;
  practiceArea: string;
  docType?: string;
  airtableDocumentId?: string;
}): Promise<DocumentRow> {
  await ensureFirmTemplateMatter();
  const category = encodeFirmSampleCategory(
    payload.practiceArea,
    payload.docType as FirmSampleDocType | undefined,
  );
  if (isDemoMode()) {
    return addDocumentDemo(FIRM_TEMPLATE_MATTER_ID, {
      title: payload.title,
      category,
      id: payload.airtableDocumentId,
    });
  }
  return documentsBackend().register(FIRM_TEMPLATE_MATTER_ID, {
    title: payload.title,
    category,
    documentId: payload.airtableDocumentId,
  });
}

export async function getAssessmentOcrNote(matterId: string): Promise<Note | null> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const matches = seed.notes
      .filter((n) => n.matterId === matterId && n.type === ASSESSMENT_DOCUMENT_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }
  try {
    return await notesBackend().findAssessmentOcr(matterId);
  } catch (error) {
    console.warn(`[AOD] assessment OCR note read failed for ${matterId}:`, error);
    return null;
  }
}

export async function saveAssessmentOcrPayload(
  matterId: string,
  payload: AssessmentOcrPayload,
  author = "Attorney",
): Promise<AssessmentOcrPayload> {
  const content = serializeAssessmentOcrPayload(payload);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes
      .filter((n) => n.matterId === matterId && n.type === ASSESSMENT_DOCUMENT_NOTE_TYPE)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (existing) {
      existing.content = content;
      existing.author = author;
    } else {
      seed.notes.push({
        id: `note-${Date.now()}`,
        matterId,
        author,
        content,
        createdAt: new Date().toISOString(),
        type: ASSESSMENT_DOCUMENT_NOTE_TYPE,
      });
    }
    const { persistSeed } = await import("./demo-store-mutable");
    await persistSeed();
    return payload;
  }

  const nb = notesBackend();
  const existing = await nb.findAssessmentOcr(matterId);
  if (existing) {
    await nb.update(existing.id, matterId, content, author);
  } else {
    await nb.create(matterId, content, author, ASSESSMENT_DOCUMENT_NOTE_TYPE);
  }
  return payload;
}

async function listDeliverableTemplateMetaNotes(): Promise<Note[]> {
  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    return seed.notes.filter(
      (n) => n.matterId === FIRM_TEMPLATE_MATTER_ID && n.type === DELIVERABLE_TEMPLATE_NOTE_TYPE,
    );
  }
  try {
    const notes = await notesBackend().listForMatter(FIRM_TEMPLATE_MATTER_ID);
    return notes.filter((n) => n.type === DELIVERABLE_TEMPLATE_NOTE_TYPE);
  } catch {
    return [];
  }
}

export async function listDeliverableTemplateDocuments(): Promise<DocumentRow[]> {
  return readPrimary(
    async () => {
      const seed = await loadDemoSeed();
      return seed.documents.filter(
        (d) => d.matterId === FIRM_TEMPLATE_MATTER_ID || isDeliverableTemplateDocument(d),
      );
    },
    () => documentsBackend().listDeliverableTemplates(),
    [],
  );
}

export async function listDeliverableTemplateCatalog(): Promise<DeliverableTemplateCatalogItem[]> {
  const { formatCatalogQuote, isPhase0LaunchSku } = await import("./deliverable-catalog");
  const [docs, notes] = await Promise.all([
    listDeliverableTemplateDocuments(),
    listDeliverableTemplateMetaNotes(),
  ]);

  const metaByDeliverable = new Map<string, DeliverableTemplateMetaPayload>();
  for (const note of notes) {
    const parsed = parseDeliverableTemplateMeta(note.content);
    if (!parsed) continue;
    const existing = metaByDeliverable.get(parsed.deliverableId);
    if (!existing || (parsed.version ?? 0) >= (existing.version ?? 0)) {
      metaByDeliverable.set(parsed.deliverableId, parsed);
    }
  }

  return DELIVERABLE_CATALOG.map((entry) => {
    const category = encodeDeliverableTemplateCategory(entry.id);
    const matches = docs
      .filter((d) => d.category === category)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    const document = matches[0] ?? null;
    const meta = metaByDeliverable.get(entry.id) ?? null;
    return {
      deliverableId: entry.id,
      name: entry.name,
      tier: entry.tier,
      description: entry.description,
      pricingLabel: formatCatalogQuote(entry),
      phase0: isPhase0LaunchSku(entry.id),
      defaultSource: defaultSourceForDeliverable(entry),
      document,
      meta,
    };
  });
}

export async function saveDeliverableTemplate(payload: {
  deliverableId: string;
  title: string;
  airtableDocumentId?: string;
  postgresDocumentId?: string;
  textPreview?: string;
  fileType?: string;
  tweakNotes?: string;
  source?: string;
  sections?: DeliverableTemplateMetaPayload["sections"];
  htmlPreview?: string;
  briefTemplate?: Record<string, unknown>;
  briefType?: string;
}): Promise<DeliverableTemplateMetaPayload> {
  const deliverableId = payload.deliverableId.trim();
  if (!deliverableId || !DELIVERABLE_CATALOG.some((d) => d.id === deliverableId)) {
    throw new Error("Unknown deliverableId");
  }
  // Notes require a linked Matter; provision FIRM-TEMPLATES on first upload.
  await ensureFirmTemplateMatter();
  const category = encodeDeliverableTemplateCategory(deliverableId);
  const existingItem = (await listDeliverableTemplateCatalog()).find(
    (c) => c.deliverableId === deliverableId,
  );
  const existingMeta = existingItem?.meta;
  const version = (existingMeta?.version ?? 0) + 1;
  const resolvedDocId =
    payload.airtableDocumentId ?? existingMeta?.airtableDocumentId ?? existingItem?.document?.id;

  let docId = resolvedDocId;
  const shouldRegisterDoc = Boolean(payload.airtableDocumentId) || !resolvedDocId;
  if (shouldRegisterDoc) {
    if (isDemoMode()) {
      const seed = await loadDemoSeed();
      const existingIdx = seed.documents.findIndex(
        (d) =>
          (d.matterId === FIRM_TEMPLATE_MATTER_ID || isDeliverableTemplateDocument(d)) &&
          d.category === category,
      );
      const doc = await addDocumentDemo(FIRM_TEMPLATE_MATTER_ID, {
        title: payload.title,
        category,
        id: payload.airtableDocumentId ?? resolvedDocId,
        fileType: payload.fileType,
      });
      if (existingIdx >= 0) {
        // addDocumentDemo appended; replace prior row for this SKU
        seed.documents[existingIdx] = doc;
        if (seed.documents[seed.documents.length - 1]?.id === doc.id) {
          seed.documents.pop();
          seed.documents[existingIdx] = doc;
        }
      }
      await persistSeed();
      docId = doc.id;
    } else {
      const doc = await documentsBackend().register(FIRM_TEMPLATE_MATTER_ID, {
        title: payload.title,
        category,
        documentId: payload.airtableDocumentId ?? resolvedDocId,
        fileType: payload.fileType,
      });
      docId = doc.id;
    }
  }

  const incomingText = payload.textPreview;
  const sourceCharCount =
    typeof incomingText === "string" ? incomingText.length : (existingMeta?.textCharCount ?? 0);

  let sections = payload.sections ?? existingMeta?.sections;
  if ((!sections || !sections.length) && incomingText) {
    sections = parseTemplateStructure(incomingText, { deliverableId });
  }

  // Prefer full extracted text. Airtable long-text max is 100k for the whole meta JSON —
  // keep structure/briefTemplate, then fit textPreview (drop htmlPreview if needed).
  const AIRTABLE_NOTE_MAX = 100_000;
  const TEXT_SOFT_MAX = 80_000;

  let textPreview =
    incomingText !== undefined
      ? incomingText.slice(0, TEXT_SOFT_MAX)
      : existingMeta?.textPreview;
  let htmlPreview: string | undefined =
    payload.htmlPreview?.slice(0, 40_000) ??
    (payload.textPreview ? undefined : existingMeta?.htmlPreview);
  let textPreviewTruncated =
    Boolean(incomingText && incomingText.length > TEXT_SOFT_MAX) ||
    Boolean(existingMeta?.textPreviewTruncated && incomingText === undefined);

  const buildMeta = (
    text: string | undefined,
    html: string | undefined,
    truncated: boolean,
  ): DeliverableTemplateMetaPayload => ({
    v: 1,
    deliverableId,
    role: "deliverable_template",
    source: payload.source ?? existingMeta?.source ?? "firm_uploaded",
    version,
    title: payload.title,
    airtableDocumentId: docId,
    postgresDocumentId: payload.postgresDocumentId ?? existingMeta?.postgresDocumentId,
    filename: payload.title,
    fileType: payload.fileType ?? existingMeta?.fileType,
    textPreview: text,
    textPreviewTruncated: truncated || undefined,
    textCharCount: sourceCharCount || (text?.length ?? undefined),
    sections: sections?.slice(0, 80),
    briefTemplate:
      (payload.briefTemplate as Record<string, unknown> | undefined) ??
      existingMeta?.briefTemplate,
    briefType: payload.briefType ?? existingMeta?.briefType,
    htmlPreview: html,
    tweakNotes: payload.tweakNotes?.slice(0, 4000) ?? existingMeta?.tweakNotes,
    uploadedAt: new Date().toISOString(),
  });

  let meta = buildMeta(textPreview, htmlPreview, textPreviewTruncated);
  let content = serializeDeliverableTemplateMeta(meta);

  // Fit into Airtable note long-text: drop HTML first, then shrink textPreview.
  if (content.length > AIRTABLE_NOTE_MAX && htmlPreview) {
    htmlPreview = undefined;
    meta = buildMeta(textPreview, htmlPreview, textPreviewTruncated);
    content = serializeDeliverableTemplateMeta(meta);
  }
  while (content.length > AIRTABLE_NOTE_MAX && textPreview && textPreview.length > 4_000) {
    const nextLen = Math.max(4_000, Math.floor(textPreview.length * 0.85));
    textPreview = textPreview.slice(0, nextLen);
    textPreviewTruncated = true;
    meta = buildMeta(textPreview, htmlPreview, true);
    content = serializeDeliverableTemplateMeta(meta);
  }
  meta = { ...meta, textPreviewTruncated: textPreviewTruncated || undefined };
  content = serializeDeliverableTemplateMeta(meta);

  if (isDemoMode()) {
    const seed = await loadDemoSeed();
    const existing = seed.notes.find(
      (n) =>
        n.matterId === FIRM_TEMPLATE_MATTER_ID &&
        n.type === DELIVERABLE_TEMPLATE_NOTE_TYPE &&
        parseDeliverableTemplateMeta(n.content)?.deliverableId === deliverableId,
    );
    if (existing) {
      existing.content = content;
      existing.author = "Attorney";
    } else {
      seed.notes.push({
        id: `note-tmpl-${Date.now()}`,
        matterId: FIRM_TEMPLATE_MATTER_ID,
        author: "Attorney",
        content,
        createdAt: new Date().toISOString(),
        type: DELIVERABLE_TEMPLATE_NOTE_TYPE,
      });
    }
    await persistSeed();
    return meta;
  }

  const notes = await listDeliverableTemplateMetaNotes();
  const existingNote = notes.find(
    (n) => parseDeliverableTemplateMeta(n.content)?.deliverableId === deliverableId,
  );
  if (existingNote) {
    await notesBackend().update(existingNote.id, FIRM_TEMPLATE_MATTER_ID, content, "Attorney");
  } else {
    await notesBackend().create(
      FIRM_TEMPLATE_MATTER_ID,
      content,
      "Attorney",
      DELIVERABLE_TEMPLATE_NOTE_TYPE,
    );
  }
  return meta;
}

export async function updateDeliverableTemplateTweaks(payload: {
  deliverableId: string;
  tweakNotes: string;
  textPreview?: string;
}): Promise<DeliverableTemplateMetaPayload> {
  const catalog = await listDeliverableTemplateCatalog();
  const item = catalog.find((c) => c.deliverableId === payload.deliverableId);
  if (!item) throw new Error("Unknown deliverableId");

  const base = item.meta ?? {
    v: 1 as const,
    deliverableId: payload.deliverableId,
    role: "deliverable_template" as const,
    source: item.defaultSource.label,
    version: 0,
    title: item.name,
  };

  return saveDeliverableTemplate({
    deliverableId: payload.deliverableId,
    title: base.title || item.document?.title || item.name,
    airtableDocumentId: base.airtableDocumentId ?? item.document?.id,
    postgresDocumentId: base.postgresDocumentId,
    textPreview: payload.textPreview ?? base.textPreview,
    fileType: base.fileType ?? item.document?.fileType,
    tweakNotes: payload.tweakNotes,
    source: base.source || "firm_uploaded",
  });
}
