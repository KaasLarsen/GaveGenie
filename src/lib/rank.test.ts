import { describe, expect, it } from "vitest";
import { filterByBudget, rankProducts, type RankableProduct } from "./rank";

const catalog: RankableProduct[] = [
  {
    id: "1",
    title: "Keramikkrus havblå",
    description: "Hånddrejet krus til kaffe",
    brand: "Studio",
    category: "Bolig",
    tags: ["keramik", "krus", "kaffe"],
    priceOre: 24900,
    currency: "DKK",
    imageUrl: null,
    productUrl: "https://example.com/1",
    inStock: true,
    isSample: true,
    retailerName: "Demo Bolig",
  },
  {
    id: "2",
    title: "Campinglygte LED",
    description: "Genopladelig lygte til outdoor",
    brand: "Trail",
    category: "Outdoor",
    tags: ["camping", "lygte"],
    priceOre: 32900,
    currency: "DKK",
    imageUrl: null,
    productUrl: "https://example.com/2",
    inStock: null,
    isSample: true,
    retailerName: "Demo Outdoor",
  },
  {
    id: "3",
    title: "Luksus parfume",
    description: "Dyr duft",
    brand: "Aether",
    category: "Skønhed",
    tags: ["parfume"],
    priceOre: 120000,
    currency: "DKK",
    imageUrl: null,
    productUrl: "https://example.com/3",
    inStock: true,
    isSample: true,
    retailerName: "Demo Skønhed",
  },
];

describe("rankProducts", () => {
  it("ranks text-relevant products higher", () => {
    const ranked = rankProducts(catalog, {
      query: "keramik krus til kaffe",
    });
    expect(ranked[0]?.id).toBe("1");
  });

  it("prefers products inside budget", () => {
    const ranked = rankProducts(catalog, {
      query: "gave",
      budgetMaxOre: 40000,
    });
    // Soft ranking: expensive items may remain but should score lower
    const luxury = ranked.find((r) => r.id === "3");
    const mug = ranked.find((r) => r.id === "1");
    expect(luxury && mug).toBeTruthy();
    expect(mug!.score).toBeGreaterThan(luxury!.score);
  });

  it("never invents product ids", () => {
    const ranked = rankProducts(catalog, { query: "ukendt xyzzzz" }, 2);
    for (const item of ranked) {
      expect(["1", "2", "3"]).toContain(item.id);
    }
  });
});

describe("filterByBudget", () => {
  it("keeps unknown prices and soft-filters extremes", () => {
    const withUnknown: RankableProduct[] = [
      ...catalog,
      {
        ...catalog[0],
        id: "4",
        title: "Ukendt pris gave",
        priceOre: null,
      },
    ];
    const filtered = filterByBudget(withUnknown, 20000, 40000);
    expect(filtered.find((p) => p.id === "4")).toBeTruthy();
    expect(filtered.find((p) => p.id === "3")).toBeFalsy();
  });
});
