import { createNoteForMatter } from "./data-store";

export type AssignmentNotifyResult = {
  matterNoteLogged: boolean;
  emailSent: boolean;
  emailSkippedReason?: string;
};

/**
 * Notify on new Submitted assignments. Always writes a system note on the matter.
 * Email is optional — requires RESEND_API_KEY + ASSIGNMENT_NOTIFY_EMAIL (attorney SMTP setup).
 */
export async function notifyNewAssignment(payload: {
  matterId: string;
  deliverableType: string;
  tier: string;
  inboxItemId: string;
  source?: "internal" | "partner";
  partnerEmail?: string;
  partnerFirmName?: string;
}): Promise<AssignmentNotifyResult> {
  const partnerLine =
    payload.source === "partner"
      ? ` Partner firm${payload.partnerFirmName ? ` (${payload.partnerFirmName})` : ""}${payload.partnerEmail ? ` — ${payload.partnerEmail}` : ""}.`
      : "";
  let matterNoteLogged = false;
  try {
    await createNoteForMatter(
      payload.matterId,
      `New assignment submitted: ${payload.deliverableType} (${payload.tier} tier). PM Inbox item ${payload.inboxItemId.slice(0, 8)}… — review in Submitted lane or wait for agent output.${partnerLine}`,
      "System",
    );
    matterNoteLogged = true;
  } catch {
    matterNoteLogged = false;
  }

  const to = process.env.ASSIGNMENT_NOTIFY_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!to) {
    return { matterNoteLogged, emailSent: false, emailSkippedReason: "ASSIGNMENT_NOTIFY_EMAIL not set" };
  }
  if (!apiKey) {
    return { matterNoteLogged, emailSent: false, emailSkippedReason: "RESEND_API_KEY not set" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ASSIGNMENT_NOTIFY_FROM?.trim() || "AssociateOnDemand <onboarding@resend.dev>",
        to: [to],
        subject: `[AOD] New assignment — ${payload.deliverableType} (${payload.matterId})`,
        text: [
          `A new ${payload.tier} tier assignment was submitted for ${payload.matterId}.`,
          `Deliverable: ${payload.deliverableType}`,
          payload.source === "partner"
            ? `Source: external partner funnel${payload.partnerFirmName ? ` (${payload.partnerFirmName})` : ""}${payload.partnerEmail ? ` — ${payload.partnerEmail}` : ""}.`
            : "Source: internal RMV operator intake.",
          `Open PM Inbox: https://aod-next.vercel.app/inbox`,
        ].join("\n"),
      }),
    });
    return { matterNoteLogged, emailSent: resp.ok, emailSkippedReason: resp.ok ? undefined : `Resend ${resp.status}` };
  } catch (err) {
    return {
      matterNoteLogged,
      emailSent: false,
      emailSkippedReason: err instanceof Error ? err.message : "Resend request failed",
    };
  }
}
