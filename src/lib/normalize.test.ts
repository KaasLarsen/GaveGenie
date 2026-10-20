import { describe, expect, it } from "vitest";
import {
  assertNormalizedProduct,
  dkkToOre,
  formatPriceDkk,
  normalizeText,
  oreToDkk,
  tokenize,
} from "./normalize";

describe("normalize", () => {
  it("converts DKK to øre", () => {
    expect(dkkToOre(249)).toBe(24900);
    expect(dkkToOre(19.5)).toBe(1950);
    expect(dkkToOre(null)).toBeNull();
  });

  it("converts øre to DKK", () => {
    expect(oreToDkk(24900)).toBe(249);
    expect(oreToDkk(null)).toBeNull();
  });

  it("formats unknown price in Danish", () => {
    expect(formatPriceDkk(null)).toBe("Pris ukendt");
    expect(formatPriceDkk(19900)).toMatch(/199/);
  });

  it("normalizes Danish text for matching", () => {
    expect(normalizeText("  Håndlavet KRUS! ")).toBe("handlavet krus");
  });

  it("tokenizes meaningfully", () => {
    expect(tokenize("te til mor")).toEqual(["te", "til", "mor"]);
  });

  it("asserts required normalized fields", () => {
    expect(() =>
      assertNormalizedProduct({
        provider: "sample-dev",
        externalId: "x",
        retailerSlug: "demo",
        retailerName: "Demo",
        title: "Test",
        tags: [],
        priceOre: 1000,
        currency: "DKK",
        productUrl: "https://example.com/p",
        inStock: null,
        isSample: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertNormalizedProduct({
        provider: "",
        externalId: "x",
        retailerSlug: "demo",
        retailerName: "Demo",
        title: "Test",
        tags: [],
        priceOre: null,
        currency: "DKK",
        productUrl: "https://example.com/p",
        inStock: null,
        isSample: true,
      }),
    ).toThrow(/provider/);
  });
});
