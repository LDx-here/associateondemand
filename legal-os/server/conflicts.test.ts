import { describe, it, expect } from "vitest";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function conflictResult(partyMatches: number, counselMatches: number): "clear" | "review_required" {
  const total = new Set([...Array(partyMatches).keys(), ...Array(counselMatches).keys()]).size;
  // Simplified: any match → review_required, never auto conflict_found
  const uniqueCount = partyMatches + counselMatches > 0 ? Math.max(partyMatches, counselMatches) : 0;
  return uniqueCount > 0 ? "review_required" : "clear";
}

describe("Conflict check logic", () => {
  it("returns clear when no matches", () => {
    expect(conflictResult(0, 0)).toBe("clear");
  });

  it("returns review_required when party matches", () => {
    expect(conflictResult(1, 0)).toBe("review_required");
  });

  it("never returns conflict_found from automated check", () => {
    const result = conflictResult(5, 3);
    expect(result).not.toBe("conflict_found");
    expect(result).toBe("review_required");
  });

  it("normalizes names for comparison", () => {
    expect(normalize("  Acme Corp  ")).toBe("acme corp");
  });
});
