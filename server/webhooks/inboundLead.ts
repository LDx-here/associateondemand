import { Request, Response, Router } from "express";
import { ENV } from "../_core/env";
import { createLead } from "../db";
import { createAirtableRecord } from "../services/airtable";
import { sendLeadNotificationEmail } from "../services/gmail";
import type { InsertLead } from "../../drizzle/schema";

const webhookRouter = Router();

/**
 * Verify webhook secret from the Authorization header or x-webhook-secret header.
 */
function verifyWebhookSecret(req: Request): boolean {
  const secret = req.headers["x-webhook-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
  return secret === ENV.webhookSecret;
}

/**
 * POST /api/webhooks/inbound-lead
 * Accepts lead payloads from external sources (AI receptionist, phone system, etc.)
 */
webhookRouter.post("/inbound-lead", async (req: Request, res: Response) => {
  // Verify webhook secret
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid webhook secret" });
  }

  const body = req.body;

  // Validate required fields
  if (!body.firstName || !body.lastName || !body.email) {
    return res.status(400).json({ error: "Missing required fields: firstName, lastName, email" });
  }

  const leadData: InsertLead = {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone || null,
    state: body.state || "Unknown",
    practiceArea: body.practiceArea || "Not sure yet",
    inquiryType: body.inquiryType || "general",
    description: body.description || "Submitted via external integration",
    newsletterOptIn: body.newsletterOptIn || false,
    status: "New",
    source: body.source || "ai-receptionist",
  };

  try {
    const lead = await createLead(leadData);
    if (!lead) {
      return res.status(500).json({ error: "Failed to create lead" });
    }

    // Send notification (non-blocking)
    sendLeadNotificationEmail(lead).catch((err) =>
      console.error("[Webhook] Notification failed:", err)
    );

    // Sync to Airtable (non-blocking)
    createAirtableRecord(lead).catch((err) =>
      console.error("[Webhook] Airtable sync failed:", err)
    );

    return res.status(201).json({ success: true, id: lead.id });
  } catch (error) {
    console.error("[Webhook] Error processing inbound lead:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default webhookRouter;
