import { describe, expect, it } from "vitest";

describe("Environment secrets", () => {
  it("AIRTABLE_PAT is set", () => {
    expect(process.env.AIRTABLE_PAT).toBeDefined();
    expect(process.env.AIRTABLE_PAT!.length).toBeGreaterThan(0);
  });

  it("AIRTABLE_BASE_ID is set", () => {
    expect(process.env.AIRTABLE_BASE_ID).toBeDefined();
    expect(process.env.AIRTABLE_BASE_ID!.length).toBeGreaterThan(0);
  });

  it("RMV_WEBHOOK_SECRET is set", () => {
    expect(process.env.RMV_WEBHOOK_SECRET).toBeDefined();
    expect(process.env.RMV_WEBHOOK_SECRET!.length).toBeGreaterThan(0);
  });

  it("GMAIL_NOTIFICATION_EMAIL is set", () => {
    expect(process.env.GMAIL_NOTIFICATION_EMAIL).toBeDefined();
    expect(process.env.GMAIL_NOTIFICATION_EMAIL).toBe("support@recovermyvalue.com");
  });
});
