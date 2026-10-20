import { describe, expect, it } from "vitest";
import { preferenceWhy } from "./why";

describe("preferenceWhy", () => {
  it("builds from preferences without embedding a product title", () => {
    const text = preferenceWhy(
      {
        query: "noget hyggeligt",
        recipient: "min søster",
        occasion: "fødselsdag",
        style: "grøn",
      },
      false,
    );
    expect(text).toBe(
      "Passer godt til min søster, relevant til fødselsdag, matcher stilen grøn.",
    );
    expect(text.toLowerCase()).not.toContain("keramik");
  });

  it("falls back to query when no other prefs are set", () => {
    expect(preferenceWhy({ query: "outdoor" }, false)).toBe(
      "Matcher din søgning “outdoor”.",
    );
  });

  it("appends sample note when isSample", () => {
    expect(preferenceWhy({ query: "bog" }, true)).toContain(
      "eksempelprodukt til udvikling",
    );
  });
});
