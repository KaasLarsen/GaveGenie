import { describe, expect, it } from "vitest";
import { SEO_MIN_PRODUCTS } from "./constants";
import {
  giftabilityScore,
  LANDING_MAX_PER_RETAILER,
  LANDING_PRODUCT_LIMIT,
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
  }>,
): {
  id: string;
  retailerName: string;
  inStock: boolean | null;
  priceOre: number | null;
  title: string;
  category: string | null;
  tags: string[];
} {
  return {
    id,
    retailerName,
    inStock: extra?.inStock ?? true,
    priceOre,
    title: extra?.title ?? `Produkt ${id}`,
    category: extra?.category ?? null,
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

  it("prefers priority gift shops over Booktok when mass catalogs are downranked", () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) =>
        candidate(`book${i}`, "Booktok.dk", 900_00),
      ),
      candidate("wine1", "DH Wines", 299_00),
      candidate("wine2", "SPS Wine", 279_00),
      candidate("scent1", "EauDeParfum.dk", 249_00),
    ];
    const out = selectLandingProducts(pool, 6, { allowMassCatalog: false });
    const names = out.map((p) => p.retailerName);
    expect(names.filter((n) => n.includes("Booktok")).length).toBeLessThanOrEqual(
      LANDING_MAX_PER_RETAILER,
    );
    expect(names.some((n) => n === "DH Wines")).toBe(true);
    expect(uniqueRetailerCount(out)).toBeGreaterThanOrEqual(3);
  });

  it("soft-overflow fills multi-shop pools that would otherwise stay short", () => {
    const pool = [
      ...Array.from({ length: 5 }, (_, i) =>
        candidate(`a${i}`, "Shop A", 400_00),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        candidate(`b${i}`, "Shop B", 350_00),
      ),
    ];
    const out = selectLandingProducts(pool, 8);
    expect(out.length).toBe(8);
    expect(uniqueRetailerCount(out)).toBe(2);
  });

  it("keeps a hard cap when the pool is a single shop", () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      candidate(`only${i}`, "SingleShop", 300_00 - i),
    );
    const out = selectLandingProducts(pool, 8);
    expect(out).toHaveLength(LANDING_MAX_PER_RETAILER);
  });

  it("ranks strong ham gifts above board-game hub filler", () => {
    const strong = candidate("watch", "DH Wines", 399_00, {
      title: "Herreur klassisk",
      category: "Herrebeklædning > Gaver til ham",
      tags: ["seo:modtager:ham"],
    });
    const filler = candidate("board", "Billigsport24", 899_00, {
      title: "Brætspil for voksne",
      tags: ["seo:modtager:ham", "seo:interesse:gameren"],
    });
    const strongScore = giftabilityScore(strong, {
      filters: { recipientId: "ham" },
    });
    const fillerScore = giftabilityScore(filler, {
      filters: { recipientId: "ham" },
    });
    expect(strongScore).toBeGreaterThan(fillerScore);

    const out = selectLandingProducts([filler, strong], 2, {
      filters: { recipientId: "ham" },
    });
    expect(out[0]?.id).toBe("watch");
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
