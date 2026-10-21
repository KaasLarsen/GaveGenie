import { describe, expect, it } from "vitest";
import { SEO_MIN_PRODUCTS } from "./constants";
import { productWhereForFilters } from "./landings";
import { enumerateLandingSpecs } from "./taxonomy";

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
