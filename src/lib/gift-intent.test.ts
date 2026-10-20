import { describe, expect, it } from "vitest";
import {
  analyzeGiftIntent,
  genderMismatchPenalty,
} from "./gift-intent";

describe("analyzeGiftIntent", () => {
  it("pulls vin as interest and mor as recipient", () => {
    const intent = analyzeGiftIntent({
      query: "søde mor på 65 som elsker vin",
    });
    expect(intent.interestTokens).toContain("vin");
    expect(intent.interestTokens).not.toContain("elsker");
    expect(intent.interestTokens).not.toContain("sode");
    expect(intent.recipientTokens).toContain("mor");
    expect(intent.recipientTokens).toContain("65");
    expect(intent.recipientGender).toBe("female");
  });

  it("detects male recipient from far", () => {
    const intent = analyzeGiftIntent({
      query: "kaffe",
      recipient: "far",
    });
    expect(intent.recipientGender).toBe("male");
    expect(intent.interestTokens).toContain("kaffe");
  });
});

describe("genderMismatchPenalty", () => {
  it("penalizes herrebukser for a female recipient", () => {
    expect(
      genderMismatchPenalty("Herrebukser slim fit", "female"),
    ).toBeGreaterThan(0.4);
  });

  it("does not penalize wine for a female recipient", () => {
    expect(genderMismatchPenalty("Rødvin gaveæske", "female")).toBe(0);
  });
});
