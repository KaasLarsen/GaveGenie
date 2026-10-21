import { describe, expect, it } from "vitest";
import type { NormalizedProduct } from "../types";
import { enrichProductSeoTags } from "./enrich-tags";
import {
  budgetSeoTag,
  interestSeoTag,
  occasionSeoTag,
  recipientSeoTag,
} from "./taxonomy";

function base(partial: Partial<NormalizedProduct>): NormalizedProduct {
  return {
    provider: "test",
    externalId: "1",
    retailerSlug: "demo",
    retailerName: "Demo",
    title: "Produkt",
    tags: [],
    priceOre: 199_00,
    currency: "DKK",
    productUrl: "https://example.com/p",
    inStock: true,
    isSample: true,
    ...partial,
  };
}

describe("enrichProductSeoTags", () => {
  it("tags gaming products for gamer interest and soft male recipient", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Gaming headset RGB",
        category: "Elektronik",
        tags: ["gaming", "headset"],
        priceOre: 399_00,
      }),
    );
    expect(enriched.tags).toContain(interestSeoTag("gameren"));
    expect(enriched.tags).toContain(recipientSeoTag("ham"));
    expect(enriched.tags).toContain(occasionSeoTag("fodselsdag"));
    expect(enriched.tags).toContain(budgetSeoTag("under-500"));
    expect(enriched.tags).toContain(budgetSeoTag("under-1000"));
    expect(enriched.tags).not.toContain(budgetSeoTag("under-200"));
  });

  it("tags beauty products for skønhed and soft female recipient", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Eau de parfum – citrus",
        category: "Skønhed",
        tags: ["parfume", "duft"],
        priceOre: 149_00,
      }),
    );
    expect(enriched.tags).toContain(interestSeoTag("skoenhed"));
    expect(enriched.tags).toContain(recipientSeoTag("hende"));
    expect(enriched.tags).toContain(budgetSeoTag("under-200"));
  });

  it("strips and regenerates previous seo tags", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Yogamåtte kork",
        tags: ["yoga", "seo:interesse:gameren", "seo:modtager:ham"],
        priceOre: 450_00,
      }),
    );
    expect(enriched.tags).toContain(interestSeoTag("fitness"));
    expect(enriched.tags).not.toContain(interestSeoTag("gameren"));
    expect(enriched.tags.filter((t) => t.startsWith("seo:interesse:"))).toEqual(
      [interestSeoTag("fitness")],
    );
  });

  it("keeps non-seo feed tags", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Plantepleje bog",
        tags: ["hobby", "grøn"],
        category: "Bøger",
        priceOre: 179_00,
      }),
    );
    expect(enriched.tags).toContain("hobby");
    expect(enriched.tags).toContain("grøn");
    expect(enriched.tags).toContain(interestSeoTag("laeseren"));
  });
});
