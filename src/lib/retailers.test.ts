import { describe, expect, it } from "vitest";
import { hasBookGiftIntent, isMassCatalogRetailer } from "./retailers";

describe("isMassCatalogRetailer", () => {
  it("detects Booktok and Med24 variants", () => {
    expect(isMassCatalogRetailer("Booktok.dk")).toBe(true);
    expect(isMassCatalogRetailer("booktok")).toBe(true);
    expect(isMassCatalogRetailer("Med24.dk")).toBe(true);
    expect(isMassCatalogRetailer("SPS Wine")).toBe(false);
  });
});

describe("hasBookGiftIntent", () => {
  it("detects explicit book requests", () => {
    expect(hasBookGiftIntent("roman til far")).toBe(true);
    expect(hasBookGiftIntent("en god bog til mor")).toBe(true);
    expect(hasBookGiftIntent("kaffe til mor")).toBe(false);
    expect(hasBookGiftIntent("noget hyggeligt", "bøger")).toBe(true);
  });
});
