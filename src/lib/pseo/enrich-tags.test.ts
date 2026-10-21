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

  it("does not put children's books on til-ham", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Peppa Pig - Skriv og visk ud",
        category: "Bøger > Gaveidéer",
        description: "Malebog for børn",
        priceOre: 79_00,
      }),
    );
    expect(enriched.tags).toContain(recipientSeoTag("barn"));
    expect(enriched.tags).not.toContain(recipientSeoTag("ham"));
    expect(enriched.tags).not.toContain(recipientSeoTag("hende"));
  });

  it("does not gender-tag random books from the word mand alone", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Den maskuline mand",
        category: "Bøger",
        priceOre: 149_00,
      }),
    );
    expect(enriched.tags).not.toContain(recipientSeoTag("ham"));
    expect(enriched.tags).not.toContain(recipientSeoTag("hende"));
  });

  it("tags explicit herretøj for ham", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Fleecetrøje",
        category: "Herrebeklædning > Gaveidéer til ham",
        priceOre: 299_00,
      }),
    );
    expect(enriched.tags).toContain(recipientSeoTag("ham"));
    expect(enriched.tags).not.toContain(recipientSeoTag("hende"));
  });

  it("tags explicit dame products for hende", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Silketørklæde",
        category: "Damebeklædning > Gaveidéer til hende",
        tags: ["female"],
        priceOre: 249_00,
      }),
    );
    expect(enriched.tags).toContain(recipientSeoTag("hende"));
    expect(enriched.tags).not.toContain(recipientSeoTag("ham"));
  });

  it("does not treat a book titled Women as a gift for hende", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Annie Leibovitz: Women",
        category: "Bøger",
        priceOre: 499_00,
      }),
    );
    expect(enriched.tags).not.toContain(recipientSeoTag("hende"));
    expect(enriched.tags).not.toContain(recipientSeoTag("ham"));
  });

  it("does not treat merchant Gaveidéer as jul", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Almindelig roman",
        category: "Bøger > Gaveidéer",
        priceOre: 129_00,
      }),
    );
    expect(enriched.tags).not.toContain(occasionSeoTag("jul"));
  });

  it("does not treat bare gaveæske as jul", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Olivenolie gaveæske",
        category: "Mad",
        priceOre: 199_00,
      }),
    );
    expect(enriched.tags).not.toContain(occasionSeoTag("jul"));
  });

  it("tags explicit julekalender as jul", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Julekalender med chokolade",
        category: "Mad",
        priceOre: 179_00,
      }),
    );
    expect(enriched.tags).toContain(occasionSeoTag("jul"));
  });

  it("does not soft-map diffuser scent alone onto til-hende", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "Diffuser med duft",
        category: "Bolig",
        tags: ["duft"],
        priceOre: 129_00,
      }),
    );
    expect(enriched.tags).not.toContain(recipientSeoTag("hende"));
    expect(enriched.tags).not.toContain(interestSeoTag("skoenhed"));
  });

  it("still soft-maps gaming headset onto til-ham", () => {
    const enriched = enrichProductSeoTags(
      base({
        title: "RGB gaming headset",
        category: "Elektronik",
        priceOre: 349_00,
      }),
    );
    expect(enriched.tags).toContain(interestSeoTag("gameren"));
    expect(enriched.tags).toContain(recipientSeoTag("ham"));
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
    expect(enriched.tags).not.toContain(recipientSeoTag("ham"));
  });
});
