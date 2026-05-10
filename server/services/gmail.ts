import { ENV } from "../_core/env";
import type { Lead } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

/**
 * Send a Gmail notification about a new lead.
 * Uses the Manus built-in notification service as the delivery mechanism.
 * The notification goes to the project owner (support@recovermyvalue.com).
 */
export async function sendLeadNotificationEmail(lead: Lead): Promise<boolean> {
  const inquiryTypeLabels: Record<string, string> = {
    general: "General question",
    understand: "Understand the process",
    strategy: "Claims Strategy Assessment",
    representation: "Full representation",
  };

  const title = `New Lead: ${lead.firstName} ${lead.lastName} — ${lead.practiceArea}`;
  const content = [
    `**New Lead Submission**`,
    ``,
    `**Name:** ${lead.firstName} ${lead.lastName}`,
    `**Email:** ${lead.email}`,
    `**Phone:** ${lead.phone || "Not provided"}`,
    `**State:** ${lead.state}`,
    `**Practice Area:** ${lead.practiceArea}`,
    `**Seeking:** ${inquiryTypeLabels[lead.inquiryType] || lead.inquiryType}`,
    `**Source:** ${lead.source}`,
    `**Newsletter Opt-In:** ${lead.newsletterOptIn ? "Yes" : "No"}`,
    ``,
    `**Description:**`,
    lead.description,
    ``,
    `---`,
    `This lead was captured at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET.`,
    `View all leads in the admin dashboard.`,
  ].join("\n");

  try {
    const delivered = await notifyOwner({ title, content });
    if (delivered) {
      console.log(`[Gmail] Notification sent for lead: ${lead.email}`);
    } else {
      console.warn(`[Gmail] Notification delivery failed for lead: ${lead.email}`);
    }
    return delivered;
  } catch (error) {
    console.error("[Gmail] Error sending notification:", error);
    return false;
  }
}
