import { describe, it, expect } from "vitest";
import { calculatePrice } from "../shared/types.js";

const multipliers = { rush24h: 2.0, rush48h: 1.5, rushWeek: 1.25 };

describe("Pricing calculator", () => {
  it("returns base fee for flexible urgency", () => {
    const result = calculatePrice(350, "flexible", multipliers, 0.1, false);
    expect(result.baseFee).toBe(350);
    expect(result.urgencyMultiplier).toBe(1);
    expect(result.totalFee).toBe(350);
  });

  it("applies 24h rush multiplier", () => {
    const result = calculatePrice(350, "24h", multipliers, 0.1, false);
    expect(result.totalFee).toBe(700);
  });

  it("applies 48h rush multiplier", () => {
    const result = calculatePrice(350, "48h", multipliers, 0.1, false);
    expect(result.totalFee).toBe(525);
  });

  it("applies this_week multiplier", () => {
    const result = calculatePrice(400, "this_week", multipliers, 0.1, false);
    expect(result.totalFee).toBe(500);
  });

  it("applies sample discount when firm memory samples exist", () => {
    const result = calculatePrice(500, "flexible", multipliers, 0.1, true);
    expect(result.sampleDiscount).toBe(0.1);
    expect(result.totalFee).toBe(450);
  });

  it("combines rush and sample discount", () => {
    const result = calculatePrice(500, "24h", multipliers, 0.1, true);
    // 500 * 2 * 0.9 = 900
    expect(result.totalFee).toBe(900);
  });
});
