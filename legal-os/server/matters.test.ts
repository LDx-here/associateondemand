import { describe, it, expect } from "vitest";
import { isValidStageTransition, MATTER_STAGES } from "../shared/types.js";

describe("Matter Engine stage transitions", () => {
  it("allows forward transitions", () => {
    expect(isValidStageTransition("intake", "conflict_check")).toBe(true);
    expect(isValidStageTransition("conflict_check", "quote")).toBe(true);
    expect(isValidStageTransition("engagement", "drafting")).toBe(true);
  });

  it("allows intake → quote skip (Quick Upload)", () => {
    expect(isValidStageTransition("intake", "quote")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isValidStageTransition("drafting", "intake")).toBe(false);
    expect(isValidStageTransition("quote", "conflict_check")).toBe(false);
  });

  it("rejects skipping multiple stages", () => {
    expect(isValidStageTransition("intake", "drafting")).toBe(false);
  });

  it("allows transition to closed from any non-closed stage", () => {
    for (const stage of MATTER_STAGES) {
      if (stage === "closed") continue;
      expect(isValidStageTransition(stage, "closed")).toBe(true);
    }
  });

  it("rejects same-stage transition", () => {
    expect(isValidStageTransition("intake", "intake")).toBe(false);
  });
});
