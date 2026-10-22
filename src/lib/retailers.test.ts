import { describe, expect, it } from "vitest";
import {
  hasBookGiftIntent,
  isChildrenCatalogRetailer,
  isMassCatalogRetailer,
  looksLikeChildProduct,
} from "./retailers";

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

describe("children catalogs", () => {
  it("detects KÆRE BØRN and Barnetsrum", () => {
    expect(isChildrenCatalogRetailer("KÆRE BØRN")).toBe(true);
    expect(isChildrenCatalogRetailer("Barnetsrum")).toBe(true);
    expect(isChildrenCatalogRetailer("Justcool.dk")).toBe(false);
  });

  it("flags tagged kids products", () => {
    expect(
      looksLikeChildProduct({
        title: "Musiklegetøj",
        category: "Legetøj",
        tags: ["seo:modtager:barn"],
        retailerName: "Demo",
      }),
    ).toBe(true);
  });
});
