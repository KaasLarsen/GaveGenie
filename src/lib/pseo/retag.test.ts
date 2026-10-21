import { describe, expect, it } from "vitest";
import { enrichProductSeoTags } from "./enrich-tags";
import type { NormalizedProduct } from "../types";

function sample(partial: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    provider: "test",
    externalId: "1",
    retailerSlug: "shop",
    retailerName: "Shop",
    title: "Fleecetrøje til mænd",
    description: "Gaveidéer til ham",
    category: "Herrebeklædning",
    tags: [],
    priceOre: 29900,
    currency: "DKK",
    productUrl: "https://example.com/p",
    inStock: true,
    isSample: false,
    ...partial,
  };
}

describe("seo retag readiness", () => {
  it("adds recipient/occasion tags to untagged catalog rows", () => {
    const enriched = enrichProductSeoTags(sample());
    expect(enriched.tags.some((t) => t.startsWith("seo:modtager:"))).toBe(true);
    expect(enriched.tags).toContain("seo:modtager:ham");
  });

  it("keeps non-seo tags when re-enriching", () => {
    const enriched = enrichProductSeoTags(
      sample({ tags: ["outdoor", "seo:modtager:ham"] }),
    );
    expect(enriched.tags).toContain("outdoor");
    expect(enriched.tags.filter((t) => t === "seo:modtager:ham")).toHaveLength(
      1,
    );
  });
});
