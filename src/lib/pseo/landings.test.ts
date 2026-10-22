import { describe, expect, it } from "vitest";
import { SEO_MIN_PRODUCTS } from "./constants";
import {
  giftabilityScore,
  LANDING_MAX_PER_RETAILER,
  LANDING_PRODUCT_LIMIT,
  matchesLandingPurpose,
  productWhereForFilters,
  selectLandingProducts,
  uniqueRetailerCount,
} from "./landings";
import { enumerateLandingSpecs } from "./taxonomy";

function candidate(
  id: string,
  retailerName: string,
  priceOre = 200_00,
  extra?: Partial<{
    title: string;
    category: string | null;
    tags: string[];
    inStock: boolean | null;
    description: string | null;
  }>,
): {
  id: string;
  retailerName: string;
  inStock: boolean | null;
  priceOre: number | null;
  title: string;
  category: string | null;
  description: string | null;
  tags: string[];
} {
  return {
    id,
    retailerName,
    inStock: extra?.inStock ?? true,
    priceOre,
    title: extra?.title ?? `Produkt ${id}`,
    category: extra?.category ?? null,
    description: extra?.description ?? null,
    tags: extra?.tags ?? [],
  };
}

describe("selectLandingProducts", () => {
  it("caps products per retailer at LANDING_MAX_PER_RETAILER", () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      candidate(`a${i}`, "Billigsport24", 500_00 - i),
    );
    const out = selectLandingProducts(pool, 12);
    expect(out).toHaveLength(LANDING_MAX_PER_RETAILER);
    expect(out.every((p) => p.retailerName === "Billigsport24")).toBe(true);
  });

  it("spreads across shops when the pool is mixed", () => {
    const pool = [
      ...Array.from({ length: 6 }, (_, i) =>
        candidate(`sport${i}`, "Billigsport24", 400_00),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        candidate(`wine${i}`, "DH Wines", 350_00),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        candidate(`perfume${i}`, "EauDeParfum.dk", 300_00),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        candidate(`poster${i}`, "Designplakater.dk", 250_00),
      ),
    ];
    const out = selectLandingProducts(pool, LANDING_PRODUCT_LIMIT);
    expect(out.length).toBeLessThanOrEqual(LANDING_PRODUCT_LIMIT);
    expect(uniqueRetailerCount(out)).toBeGreaterThanOrEqual(3);
    const counts = new Map<string, number>();
    for (const p of out) {
      counts.set(p.retailerName, (counts.get(p.retailerName) ?? 0) + 1);
    }
    for (const n of counts.values()) {
      expect(n).toBeLessThanOrEqual(LANDING_MAX_PER_RETAILER);
    }
  });

  it("hard-excludes Booktok on non-læseren guides", () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) =>
        candidate(`book${i}`, "Booktok.dk", 900_00, {
          title: `Roman ${i}`,
          tags: ["seo:interesse:laeseren"],
        }),
      ),
      candidate("wine1", "DH Wines", 299_00, {
        title: "Rødvin gaveæske",
        category: "Vin",
        tags: ["seo:interesse:madentusiasten"],
      }),
      candidate("scent1", "EauDeParfum.dk", 249_00, {
        title: "Eau de parfum",
        tags: ["seo:interesse:skoenhed", "female"],
      }),
    ];
    const out = selectLandingProducts(pool, 6, {
      allowMassCatalog: false,
      filters: { interestId: "madentusiasten" },
    });
    expect(out.every((p) => !p.retailerName.includes("Booktok"))).toBe(true);
    expect(out.some((p) => p.retailerName === "DH Wines")).toBe(true);
  });

  it("does not soft-overflow past the per-shop cap", () => {
    const pool = [
      ...Array.from({ length: 5 }, (_, i) =>
        candidate(`a${i}`, "Shop A", 400_00, {
          title: `Julegave ${i}`,
          tags: ["seo:anledning:jul"],
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        candidate(`b${i}`, "Shop B", 350_00, {
          title: `Julekalender ${i}`,
          tags: ["seo:anledning:jul"],
        }),
      ),
    ];
    const out = selectLandingProducts(pool, 8, {
      filters: { occasionId: "jul" },
    });
    expect(out.length).toBe(LANDING_MAX_PER_RETAILER * 2);
    expect(uniqueRetailerCount(out)).toBe(2);
    const counts = new Map<string, number>();
    for (const p of out) {
      counts.set(p.retailerName, (counts.get(p.retailerName) ?? 0) + 1);
    }
    for (const n of counts.values()) {
      expect(n).toBeLessThanOrEqual(LANDING_MAX_PER_RETAILER);
    }
  });

  it("keeps a hard cap when the pool is a single shop", () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      candidate(`only${i}`, "SingleShop", 300_00 - i, {
        title: `Julegave ${i}`,
      }),
    );
    const out = selectLandingProducts(pool, 8, {
      filters: { occasionId: "jul" },
    });
    expect(out).toHaveLength(LANDING_MAX_PER_RETAILER);
  });

  it("drops board-game filler from bare til-ham and keeps strong ham gifts", () => {
    const strong = candidate("watch", "Apuls.dk", 399_00, {
      title: "Herreur klassisk",
      category: "Herrebeklædning > Gaver til ham",
      tags: ["seo:modtager:ham"],
    });
    const filler = candidate("board", "Billigsport24", 899_00, {
      title: "Brætspil for voksne",
      tags: ["seo:modtager:ham", "seo:interesse:gameren"],
    });
    const wineOffPurpose = candidate("wine", "DH Wines", 299_00, {
      title: "Barolo 2019",
      category: "Vin",
      tags: ["seo:modtager:ham"],
    });

    expect(
      matchesLandingPurpose(filler, { filters: { recipientId: "ham" } }),
    ).toBe(false);
    expect(
      matchesLandingPurpose(wineOffPurpose, {
        filters: { recipientId: "ham" },
      }),
    ).toBe(false);
    expect(
      matchesLandingPurpose(strong, { filters: { recipientId: "ham" } }),
    ).toBe(true);

    const out = selectLandingProducts([filler, strong, wineOffPurpose], 3, {
      filters: { recipientId: "ham" },
    });
    expect(out.map((p) => p.id)).toEqual(["watch"]);
  });

  it("requires interest keywords on interest guides", () => {
    const gaming = candidate("headset", "Justcool.dk", 399_00, {
      title: "RGB gaming headset",
      category: "Elektronik",
      tags: ["seo:modtager:ham", "seo:interesse:gameren", "male"],
    });
    const randomHam = candidate("socks", "Billigsport24", 199_00, {
      title: "Herresokker 3-pak",
      category: "Herrebeklædning",
      tags: ["seo:modtager:ham", "seo:interesse:gameren"],
    });
    const out = selectLandingProducts([gaming, randomHam], 2, {
      filters: { recipientId: "ham", interestId: "gameren" },
    });
    expect(out.map((p) => p.id)).toEqual(["headset"]);
  });

  it("requires occasion keywords on occasion guides", () => {
    const jul = candidate("advent", "DH Wines", 249_00, {
      title: "Julekalender med vin",
      tags: ["seo:anledning:jul"],
    });
    const plainBox = candidate("box", "Med24", 149_00, {
      title: "Gaveæske neutral",
      tags: ["seo:anledning:jul"],
    });
    expect(
      matchesLandingPurpose(jul, { filters: { occasionId: "jul" } }),
    ).toBe(true);
    expect(
      matchesLandingPurpose(plainBox, {
        allowMassCatalog: true,
        filters: { occasionId: "jul" },
      }),
    ).toBe(false);
  });

  it("does not boost wine shops on bare til-ham over real ham gifts", () => {
    const watch = candidate("watch", "Apuls.dk", 399_00, {
      title: "Gave til ham — herreur",
      category: "Herrebeklædning",
      tags: ["seo:modtager:ham"],
    });
    const wine = candidate("wine", "DH Wines", 299_00, {
      title: "Gave til ham — rødvin",
      category: "Vin",
      tags: ["seo:modtager:ham"],
    });
    // Same gift/gender signals; wine shop must not win via priority boost.
    const watchScore = giftabilityScore(watch, {
      filters: { recipientId: "ham" },
    });
    const wineScore = giftabilityScore(wine, {
      filters: { recipientId: "ham" },
    });
    expect(watchScore).toBeGreaterThanOrEqual(wineScore);

    const madWineScore = giftabilityScore(wine, {
      filters: { interestId: "madentusiasten" },
    });
    // Wine shops still get a purpose-fit boost on madentusiasten.
    expect(madWineScore).toBeGreaterThan(wineScore);
  });
});

describe("enumerateLandingSpecs", () => {
  it("includes known example paths from the pSEO plan", () => {
    const slugs = enumerateLandingSpecs().map((s) => s.slug);
    expect(slugs).toContain("til-ham/gameren");
    expect(slugs).toContain("jul/under-200");
    expect(slugs).toContain("til-hende");
    expect(slugs).toContain("fodselsdag");
  });

  it("sets required tags for recipient-interest", () => {
    const spec = enumerateLandingSpecs().find(
      (s) => s.slug === "til-ham/gameren",
    );
    expect(spec?.requiredTags).toEqual([
      "seo:modtager:ham",
      "seo:interesse:gameren",
    ]);
  });
});

describe("productWhereForFilters", () => {
  it("builds hasEvery tags and optional price filter", () => {
    expect(
      productWhereForFilters({
        recipientId: "ham",
        interestId: "gameren",
      }),
    ).toEqual({
      tags: {
        hasEvery: ["seo:modtager:ham", "seo:interesse:gameren"],
      },
      NOT: { tags: { has: "seo:modtager:barn" } },
    });

    expect(
      productWhereForFilters({
        recipientId: "hende",
      }),
    ).toEqual({
      tags: {
        hasEvery: ["seo:modtager:hende"],
      },
      NOT: {
        OR: [
          { tags: { has: "seo:modtager:barn" } },
          { tags: { has: "seo:interesse:laeseren" } },
        ],
      },
    });

    expect(
      productWhereForFilters({
        occasionId: "jul",
        budgetId: "under-200",
        budgetMaxOre: 200_00,
      }),
    ).toEqual({
      tags: {
        hasEvery: ["seo:anledning:jul", "seo:budget:under-200"],
      },
      priceOre: { lte: 200_00 },
    });

    expect(
      productWhereForFilters({
        occasionId: "mors-dag",
      }),
    ).toEqual({
      tags: {
        hasEvery: ["seo:anledning:mors-dag"],
      },
      NOT: { tags: { has: "seo:modtager:barn" } },
    });
  });
});

describe("indexation guard constant", () => {
  it("requires at least 5 products", () => {
    expect(SEO_MIN_PRODUCTS).toBe(5);
  });
});

/** Pure helper mirroring sitemap inclusion rule. */
function sitemapLandingUrls(
  landings: Array<{ slug: string; indexed: boolean }>,
  siteUrl: string,
): string[] {
  return landings
    .filter((l) => l.indexed)
    .map((l) => `${siteUrl}/gaver/${l.slug}`);
}

describe("sitemap indexation filter", () => {
  it("only includes indexed landings", () => {
    const urls = sitemapLandingUrls(
      [
        { slug: "til-ham/gameren", indexed: true },
        { slug: "til-ham/fitness", indexed: false },
        { slug: "jul/under-500", indexed: true },
      ],
      "https://gavegenie.dk",
    );
    expect(urls).toEqual([
      "https://gavegenie.dk/gaver/til-ham/gameren",
      "https://gavegenie.dk/gaver/jul/under-500",
    ]);
  });
});
