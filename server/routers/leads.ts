import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { createLead, getAllLeads, updateLeadStatus } from "../db";
import { createAirtableRecord } from "../services/airtable";
import { sendLeadNotificationEmail } from "../services/gmail";
import type { InsertLead } from "../../drizzle/schema";

const submitLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  state: z.string().min(1),
  practiceArea: z.string().optional().default("Not sure yet"),
  inquiryType: z.string().optional().default("general"),
  description: z.string().min(1),
  newsletterOptIn: z.boolean().optional().default(false),
});

export const leadsRouter = router({
  submit: publicProcedure.input(submitLeadSchema).mutation(async ({ input }) => {
    const leadData: InsertLead = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || null,
      state: input.state,
      practiceArea: (input.practiceArea as InsertLead["practiceArea"]) || "Not sure yet",
      inquiryType: (input.inquiryType as InsertLead["inquiryType"]) || "general",
      description: input.description,
      newsletterOptIn: input.newsletterOptIn,
      status: "New",
      source: "website",
    };

    const lead = await createLead(leadData);
    if (!lead) {
      throw new Error("Failed to create lead");
    }

    // Send notification (non-blocking)
    sendLeadNotificationEmail(lead).catch((err) =>
      console.error("[Lead] Notification failed:", err)
    );

    // Sync to Airtable (non-blocking)
    createAirtableRecord(lead).catch((err) =>
      console.error("[Lead] Airtable sync failed:", err)
    );

    return { success: true, id: lead.id };
  }),

  list: adminProcedure.query(async () => {
    return getAllLeads();
  }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["New", "Contacted", "Strategy Call Booked", "Active Client", "Closed"]) }))
    .mutation(async ({ input }) => {
      await updateLeadStatus(input.id, input.status);
      return { success: true };
    }),
});
