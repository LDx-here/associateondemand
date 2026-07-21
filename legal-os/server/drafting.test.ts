import { describe, it, expect } from "vitest";
import { buildDraftingPrompt } from "../shared/types.js";

describe("Drafting prompt builder", () => {
  const matter = {
    matterType: "employment",
    jurisdiction: "N.D. Illinois",
    caption: "Smith v. Acme Corp",
    opposingParty: "Acme Corp",
  };

  it("includes matter context without firm profile", () => {
    const prompt = buildDraftingPrompt(null, null, matter);
    expect(prompt).toContain("MATTER CONTEXT");
    expect(prompt).toContain("employment");
    expect(prompt).toContain("N.D. Illinois");
    expect(prompt).not.toContain("FIRM STYLE REQUIREMENTS");
  });

  it("injects firm memory when profile exists", () => {
    const prompt = buildDraftingPrompt(
      { systemPrompt: "You are an expert legal drafting assistant." },
      {
        writingTone: "aggressive",
        citationStyle: "Bluebook",
        captionFormat: "All caps parties",
        formattingPreferences: { headings: "numbered" },
        preferredArguments: { style: "issue-first" },
        additionalNotes: "Always cite Seventh Circuit.",
      },
      matter
    );
    expect(prompt).toContain("FIRM STYLE REQUIREMENTS");
    expect(prompt).toContain("aggressive");
    expect(prompt).toContain("Bluebook");
    expect(prompt).toContain("Seventh Circuit");
    expect(prompt).toContain("firm's own associate attorney");
  });

  it("uses custom system prompt from config", () => {
    const prompt = buildDraftingPrompt(
      { systemPrompt: "Custom motion drafter prompt." },
      null,
      matter
    );
    expect(prompt.startsWith("Custom motion drafter prompt.")).toBe(true);
  });
});
