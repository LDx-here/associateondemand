import { NextResponse } from "next/server";

import {
  getDraftingFactsForMatter,
  getFirmMemoryStatus,
  getInboxItemById,
  getMatterByCode,
  listContactsForMatter,
  listDocumentsForMatter,
  listLegalElements,
  listNotesForMatter,
} from "@/lib/data-store";
import { draftingFactsCompleteness } from "@/lib/practice-area-facts";

type Ctx = { params: Promise<{ itemId: string }> };

export type AssignmentMissingItem = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  cta?: string;
};

/**
 * Enrich an inbox assignment for the detail drawer: matter, client contact,
 * latest agent draft, docs/elements counts, and an actionable "what's missing" list.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { itemId } = await ctx.params;
  const item = await getInboxItemById(itemId);
  if (!item) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const matterId = item.matterId?.trim() || "";
  const [matter, contacts, documents, legalElements, notes, draftingFacts, firmMemory] =
    await Promise.all([
      matterId ? getMatterByCode(matterId) : Promise.resolve(null),
      matterId ? listContactsForMatter(matterId).catch(() => []) : Promise.resolve([]),
      matterId ? listDocumentsForMatter(matterId).catch(() => []) : Promise.resolve([]),
      matterId ? listLegalElements(matterId).catch(() => []) : Promise.resolve([]),
      matterId ? listNotesForMatter(matterId).catch(() => []) : Promise.resolve([]),
      matterId ? getDraftingFactsForMatter(matterId).catch(() => null) : Promise.resolve(null),
      getFirmMemoryStatus().catch(() => ({
        templateCount: 0,
        sampleCount: 0,
        stylePreferenceCount: 0,
        configured: false,
      })),
    ]);

  const clientContacts = contacts.filter((c) => {
    const role = (c.role || "").toLowerCase();
    return role === "client" || role.includes("client");
  });
  const primaryClient = clientContacts[0] ?? contacts[0] ?? null;

  const agentNotes = notes
    .filter((n) => n.type === "Agent")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestDraft = agentNotes[0] ?? null;

  const factsCompleteness = draftingFacts
    ? draftingFactsCompleteness(draftingFacts, item.deliverableCatalogId ?? draftingFacts.deliverableId)
    : null;

  const missing: AssignmentMissingItem[] = [];

  if (!matterId || !matter) {
    missing.push({
      id: "matter",
      label: "No matter linked",
      detail: "Link or open a matter so drafts and documents have a home.",
      href: "/matters",
      cta: "Browse matters",
    });
  } else {
    if (!primaryClient) {
      missing.push({
        id: "client",
        label: "No client contact linked",
        detail: "Add a Client contact on the matter for intake context and conflict checks.",
        href: `/matters/${matterId}`,
        cta: "Open matter contacts",
      });
    }
    if (documents.length === 0) {
      missing.push({
        id: "documents",
        label: "No documents on file",
        detail: "Upload source docs or a case assessment for drafting context.",
        href: `/matters/${matterId}`,
        cta: "Open matter documents",
      });
    }
    if (legalElements.length === 0) {
      missing.push({
        id: "legal_elements",
        label: "Firm Knowledge elements empty",
        detail: "Seed Legal Elements on the matter so drafting can check claim completeness.",
        href: `/matters/${matterId}`,
        cta: "Open Legal Elements",
      });
    }
    const factsThin =
      !item.facts?.trim() &&
      (!factsCompleteness || factsCompleteness.percent < 50);
    if (factsThin) {
      missing.push({
        id: "facts",
        label: "Facts incomplete",
        detail: factsCompleteness
          ? `Structured facts ${factsCompleteness.filled}/${factsCompleteness.total} (${factsCompleteness.percent}%).`
          : "No freeform or structured drafting facts captured yet.",
        href: `/matters/${matterId}`,
        cta: "Complete facts on matter",
      });
    }
  }

  if (!latestDraft) {
    const tried = item.whatTried?.toLowerCase() ?? "";
    const hintedDraft =
      tried.includes("produced") ||
      tried.includes("draft") ||
      tried.includes("memo") ||
      tried.includes("ready") ||
      tried.includes("first-pass");
    if (!hintedDraft) {
      missing.push({
        id: "draft",
        label: "No draft yet",
        detail: "Run the Associate drafting agent on the matter to produce a first-pass memo.",
        href: matterId ? `/matters/${matterId}` : "/assignments/new",
        cta: matterId ? "Open Associate on matter" : "Submit assignment",
      });
    }
  }

  if (!firmMemory.configured) {
    missing.push({
      id: "firm_memory",
      label: "Firm Memory not configured",
      detail: "Upload letterhead, samples, or style prefs so drafts match firm voice.",
      href: "/firm-memory",
      cta: "Set up Firm Memory",
    });
  }

  return NextResponse.json({
    item,
    matter: matter
      ? {
          matterId: matter.matterId,
          title: matter.title || matter.clientName || matter.matterId,
          caseType: matter.caseType,
          status: matter.status,
          posture: matter.posture || matter.proceduralPosture,
          country: matter.country,
          nextDeadline: matter.nextDeadline,
        }
      : null,
    client: primaryClient
      ? {
          id: primaryClient.id,
          displayName: primaryClient.displayName,
          role: primaryClient.role,
          email: primaryClient.email,
          organization: primaryClient.organization,
        }
      : null,
    draft: latestDraft
      ? {
          id: latestDraft.id,
          author: latestDraft.author,
          content: latestDraft.content,
          createdAt: latestDraft.createdAt,
          preview: latestDraft.content.trim().slice(0, 1200),
        }
      : null,
    counts: {
      documents: documents.length,
      legalElements: legalElements.length,
      contacts: contacts.length,
      agentNotes: agentNotes.length,
    },
    factsCompleteness,
    firmMemory,
    missing,
  });
}
