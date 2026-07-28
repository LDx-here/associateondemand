/**
 * PM Inbox `options` column parsing/serialization — shared by Airtable + Google Sheets.
 */

import type { AssignmentTier, InboxItem } from "./types";

export const DEFAULT_INBOX_BUTTONS = ["Approve", "Reject", "Modify", "Defer"];

export type ParsedInboxOptions = {
  buttons: string[];
  followUpSteps: string[];
  kind: "assignment" | "agent_flag";
  deliverableType?: string;
  tier?: AssignmentTier;
  facts?: string;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  deliveredAt?: string;
  source?: "internal" | "partner";
  partnerEmail?: string;
  partnerFirmName?: string;
  history?: Array<{ status: string; note?: string; at: string; by?: string }>;
};

export function parsePmInboxOptions(raw: unknown): ParsedInboxOptions {
  function fromDelimited(source: string): string[] {
    return source
      .split(/[\n;|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fallback: ParsedInboxOptions = {
    buttons: [...DEFAULT_INBOX_BUTTONS],
    followUpSteps: [],
    kind: "agent_flag",
  };

  if (!raw) return fallback;

  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const nextRaw = o.next_steps ?? o.suggested_next_steps ?? o.nextSteps;
    const followUpSteps = Array.isArray(nextRaw) ? nextRaw.map(String).filter(Boolean) : [];
    let buttons: string[] = [];
    if (Array.isArray(o.actions)) buttons = o.actions.map(String).filter(Boolean);
    else if (Array.isArray(o.buttons)) buttons = o.buttons.map(String).filter(Boolean);
    else if (Array.isArray(o.options)) buttons = o.options.map(String).filter(Boolean);
    const history = Array.isArray(o.history)
      ? (o.history as Array<Record<string, unknown>>)
          .map((h) => ({
            status: String(h.status ?? ""),
            note: h.note ? String(h.note) : undefined,
            at: String(h.at ?? ""),
            by: h.by ? String(h.by) : undefined,
          }))
          .filter((h) => h.status)
      : undefined;
    return {
      buttons: buttons.length ? buttons : [...DEFAULT_INBOX_BUTTONS],
      followUpSteps,
      kind: o.kind === "assignment" ? "assignment" : "agent_flag",
      deliverableType: o.deliverableType ? String(o.deliverableType) : undefined,
      tier: o.tier === "Template" || o.tier === "Custom" || o.tier === "Research" ? o.tier : undefined,
      facts: o.facts ? String(o.facts) : undefined,
      priority: o.priority ? String(o.priority) : undefined,
      dueDate: o.dueDate ? String(o.dueDate) : null,
      sampleDiscountEligible: Boolean(o.sampleDiscountEligible),
      discountApplied: Boolean(o.discountApplied),
      paymentStatus:
        o.paymentStatus === "pending" || o.paymentStatus === "paid" || o.paymentStatus === "invoice"
          ? o.paymentStatus
          : undefined,
      stripeSessionId: o.stripeSessionId ? String(o.stripeSessionId) : undefined,
      amountCents: typeof o.amountCents === "number" ? o.amountCents : undefined,
      deliverableCatalogId: o.deliverableCatalogId ? String(o.deliverableCatalogId) : undefined,
      conflictReviewRequired: Boolean(o.conflictReviewRequired),
      opposingParty: o.opposingParty ? String(o.opposingParty) : undefined,
      opposingCounsel: o.opposingCounsel ? String(o.opposingCounsel) : undefined,
      deliveredAt: o.deliveredAt ? String(o.deliveredAt) : undefined,
      source: o.source === "partner" || o.source === "internal" ? o.source : undefined,
      partnerEmail: o.partnerEmail ? String(o.partnerEmail) : undefined,
      partnerFirmName: o.partnerFirmName ? String(o.partnerFirmName) : undefined,
      history,
    };
  }

  if (Array.isArray(raw)) {
    const buttons = raw.map(String).filter(Boolean);
    return { ...fallback, buttons: buttons.length ? buttons : [...DEFAULT_INBOX_BUTTONS] };
  }

  const text = String(raw).trim();
  if (!text) return fallback;

  if (text.startsWith("{")) {
    try {
      const o = JSON.parse(text);
      return parsePmInboxOptions(o);
    } catch {
      /* fallthrough */
    }
  }

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsePmInboxOptions(parsed);
    } catch {
      /* fallthrough */
    }
  }

  const split = fromDelimited(text);
  return { ...fallback, buttons: split.length ? split : [...DEFAULT_INBOX_BUTTONS] };
}

export function serializeAssignmentOptions(payload: {
  deliverableType: string;
  tier: AssignmentTier;
  facts: string;
  priority?: string;
  dueDate?: string | null;
  sampleDiscountEligible?: boolean;
  discountApplied?: boolean;
  paymentStatus?: "pending" | "paid" | "invoice";
  stripeSessionId?: string;
  amountCents?: number;
  deliverableCatalogId?: string;
  conflictReviewRequired?: boolean;
  opposingParty?: string;
  opposingCounsel?: string;
  deliveredAt?: string;
  source?: "internal" | "partner";
  partnerEmail?: string;
  partnerFirmName?: string;
  history: Array<{ status: string; note?: string; at: string; by?: string }>;
}): string {
  return JSON.stringify({
    kind: "assignment",
    deliverableType: payload.deliverableType,
    tier: payload.tier,
    facts: payload.facts,
    priority: payload.priority ?? "Medium",
    dueDate: payload.dueDate ?? null,
    sampleDiscountEligible: payload.sampleDiscountEligible ?? false,
    discountApplied: payload.discountApplied ?? false,
    paymentStatus: payload.paymentStatus,
    stripeSessionId: payload.stripeSessionId,
    amountCents: payload.amountCents,
    deliverableCatalogId: payload.deliverableCatalogId,
    conflictReviewRequired: payload.conflictReviewRequired ?? false,
    opposingParty: payload.opposingParty,
    opposingCounsel: payload.opposingCounsel,
    deliveredAt: payload.deliveredAt,
    source: payload.source,
    partnerEmail: payload.partnerEmail,
    partnerFirmName: payload.partnerFirmName,
    history: payload.history,
  });
}

export function assignmentOptionsFromItem(item: InboxItem, history: InboxItem["history"]) {
  return {
    deliverableType: item.deliverableType ?? "",
    tier: item.tier ?? "Custom",
    facts: item.facts ?? item.whatNeeded,
    priority: item.priority,
    dueDate: item.dueDate,
    sampleDiscountEligible: item.sampleDiscountEligible,
    discountApplied: item.discountApplied,
    paymentStatus: item.paymentStatus,
    stripeSessionId: item.stripeSessionId,
    amountCents: item.amountCents,
    deliverableCatalogId: item.deliverableCatalogId,
    conflictReviewRequired: item.conflictReviewRequired,
    opposingParty: item.opposingParty,
    opposingCounsel: item.opposingCounsel,
    deliveredAt: item.deliveredAt,
    source: item.source,
    partnerEmail: item.partnerEmail,
    partnerFirmName: item.partnerFirmName,
    history: history ?? [],
  };
}

export function inboxItemFromParsedFields(fields: {
  id: string;
  title?: string;
  matterId?: string;
  agent?: string;
  whatTried?: string;
  whatNeeded?: string;
  optionsRaw?: unknown;
  status?: string;
  resolution?: string;
  createdAt?: string;
  resolvedAt?: string | null;
}): InboxItem {
  const parsed = parsePmInboxOptions(fields.optionsRaw);
  return {
    id: fields.id,
    title: fields.title ?? "",
    matterId: fields.matterId ?? "",
    agent: fields.agent ?? "",
    whatTried: fields.whatTried ?? "",
    whatNeeded: fields.whatNeeded ?? "",
    options: parsed.buttons,
    followUpSteps: parsed.followUpSteps,
    status: fields.status ?? "Pending",
    resolution: fields.resolution ?? "",
    createdAt: fields.createdAt ?? "",
    resolvedAt: fields.resolvedAt ?? null,
    kind: parsed.kind,
    deliverableType: parsed.deliverableType,
    tier: parsed.tier,
    facts: parsed.facts,
    priority: parsed.priority,
    dueDate: parsed.dueDate,
    sampleDiscountEligible: parsed.sampleDiscountEligible,
    discountApplied: parsed.discountApplied,
    paymentStatus: parsed.paymentStatus,
    stripeSessionId: parsed.stripeSessionId,
    amountCents: parsed.amountCents,
    deliverableCatalogId: parsed.deliverableCatalogId,
    conflictReviewRequired: parsed.conflictReviewRequired,
    opposingParty: parsed.opposingParty,
    opposingCounsel: parsed.opposingCounsel,
    deliveredAt: parsed.deliveredAt,
    source: parsed.source,
    partnerEmail: parsed.partnerEmail,
    partnerFirmName: parsed.partnerFirmName,
    history: parsed.history,
  };
}
