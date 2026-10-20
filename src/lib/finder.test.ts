import { describe, expect, it } from "vitest";
import {
  buildCandidateWhere,
  preferenceSearchTokens,
  toPreferences,
} from "./finder";

describe("preferenceSearchTokens", () => {
  it("extracts unique tokens from preferences", () => {
    const tokens = preferenceSearchTokens(
      toPreferences({
        query: "skøjter til voksen",
        recipient: "far",
        occasion: "fødselsdag",
      }),
    );
    expect(tokens).toContain("skøjter");
    expect(tokens).toContain("voksen");
    expect(tokens).toContain("fødselsdag");
  });
});

describe("buildCandidateWhere", () => {
  it("excludes samples and adds token OR clauses", () => {
    const where = buildCandidateWhere(
      toPreferences({ query: "plakat", budgetMinDkk: 100, budgetMaxDkk: 300 }),
      { excludeSamples: true, tokens: ["plakat"] },
    );

    expect(where).toHaveProperty("AND");
    const and = (where as { AND: unknown[] }).AND;
    expect(and).toEqual(
      expect.arrayContaining([
        { isSample: false },
        expect.objectContaining({ OR: expect.any(Array) }),
      ]),
    );
  });

  it("returns empty object when nothing to filter", () => {
    expect(
      buildCandidateWhere(toPreferences({ query: "ab" }), {
        excludeSamples: false,
        tokens: [],
      }),
    ).toEqual({});
  });
});
