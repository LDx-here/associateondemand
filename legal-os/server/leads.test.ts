import { describe, it, expect } from "vitest";
import { validateWorkEmail, BLOCKED_EMAIL_DOMAINS } from "../shared/types.js";

describe("Lead email domain validation", () => {
  it("accepts firm email domains", () => {
    expect(validateWorkEmail("partner@smithlaw.com")).toBe(true);
    expect(validateWorkEmail("j.doe@bigfirm.co.uk")).toBe(true);
  });

  it("rejects consumer email domains", () => {
    for (const domain of BLOCKED_EMAIL_DOMAINS) {
      expect(validateWorkEmail(`user@${domain}`)).toBe(false);
    }
  });

  it("is case-insensitive on domain", () => {
    expect(validateWorkEmail("user@Gmail.COM")).toBe(false);
  });
});
