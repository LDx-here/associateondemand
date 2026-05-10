import { ENV } from "../_core/env";
import type { Lead } from "../../drizzle/schema";

export async function createAirtableRecord(lead: Lead): Promise<string | null> {
  if (!ENV.airtablePat || !ENV.airtableBaseId) {
    console.warn("[Airtable] Missing PAT or Base ID, skipping Airtable sync");
    return null;
  }

  const url = `https://api.airtable.com/v0/${ENV.airtableBaseId}/Leads`;

  const fields: Record<string, unknown> = {
    "Name": `${lead.firstName} ${lead.lastName}`,
    "First Name": lead.firstName,
    "Last Name": lead.lastName,
    "Email": lead.email,
    "Phone": lead.phone || "",
    "State": lead.state,
    "Practice Area": lead.practiceArea,
    "Inquiry Type": lead.inquiryType,
    "Description": lead.description,
    "Status": lead.status,
    "Source": lead.source,
    "Newsletter Opt-In": lead.newsletterOptIn,
    "Created At": lead.createdAt ? new Date(lead.createdAt).toISOString() : new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.airtablePat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Airtable] Failed to create record: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error("[Airtable] Error creating record:", error);
    return null;
  }
}
