import { describe, expect, it } from "vitest";
import {
  diversifyByRetailer,
  filterByBudget,
  rankProducts,
  type RankableProduct,
} from "./rank";

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

  it("prefers products inside budget when interest is weak", () => {
    const ranked = rankProducts(catalog, {
      query: "bolig",
      budgetMaxOre: 40000,
    });
    const luxury = ranked.find((r) => r.id === "3");
    const mug = ranked.find((r) => r.id === "1");
    expect(mug).toBeTruthy();
    if (luxury && mug) {
      expect(mug.score).toBeGreaterThan(luxury.score);
    }
  });

  it("never invents product ids", () => {
    const ranked = rankProducts(catalog, { query: "ukendt xyzzzz" }, 2);
    for (const item of ranked) {
      expect(["1", "2", "3"]).toContain(item.id);
    }
  });

  it("does not treat vinyl as a vin match", () => {
    const mixed: RankableProduct[] = [
      {
        id: "vinyl-weights",
        title: "Håndvægte i vinyl",
        description: "Sekskantede vægte i vinyl",
        brand: "Odin",
        category: "Træning",
        tags: ["vinyl", "vægte"],
        priceOre: 79900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/vinyl",
        inStock: true,
        isSample: false,
        retailerName: "Apuls.dk",
      },
      {
        id: "wine",
        title: "Økologisk rødvin",
        description: "Italiensk vin",
        brand: "SPS",
        category: "Vin",
        tags: ["vin", "rødvin"],
        priceOre: 12900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/wine",
        inStock: true,
        isSample: false,
        retailerName: "SPS Wine",
      },
    ];
    const ranked = rankProducts(mixed, { query: "vin til mor" }, 2, {
      plannedQueries: ["vin", "rødvin"],
    });
    expect(ranked[0]?.id).toBe("wine");
    expect(ranked.find((r) => r.id === "vinyl-weights")).toBeFalsy();
  });

  it("prefers wine gifts over herrebukser for a mom who loves wine", () => {
    const mixed: RankableProduct[] = [
      {
        id: "pants",
        title: "Herrebukser slim fit sort",
        description: "Bukser til mænd",
        brand: "Justcool",
        category: "Tøj",
        tags: ["herre", "bukser"],
        priceOre: 39900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/pants",
        inStock: true,
        isSample: false,
        retailerName: "Justcool.dk",
      },
      {
        id: "wine",
        title: "Rødvin gaveæske Rioja",
        description: "Lækker vin til gaven",
        brand: "DH Wines",
        category: "Vin",
        tags: ["vin", "rødvin", "gave"],
        priceOre: 24900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/wine",
        inStock: true,
        isSample: false,
        retailerName: "DH Wines",
      },
      {
        id: "winter",
        title: "Vinterjakke dame",
        description: "Varm jakke",
        brand: "Justcool",
        category: "Tøj",
        tags: ["vinter", "jakke"],
        priceOre: 79900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/winter",
        inStock: true,
        isSample: false,
        retailerName: "Justcool.dk",
      },
    ];

    const ranked = rankProducts(
      mixed,
      { query: "søde mor på 65 som elsker vin" },
      3,
    );
    expect(ranked[0]?.id).toBe("wine");
    expect(ranked.find((r) => r.id === "pants")).toBeFalsy();
  });

  it("spreads results across retailers", () => {
    const sameShop: RankableProduct[] = Array.from({ length: 8 }, (_, i) => ({
      id: `jc-${i}`,
      title: `Vinglas sæt ${i}`,
      description: "Glas til vin",
      brand: "Justcool",
      category: "Bolig",
      tags: ["vin", "glas"],
      priceOre: 19900 + i * 100,
      currency: "DKK",
      imageUrl: null,
      productUrl: `https://example.com/${i}`,
      inStock: true,
      isSample: false,
      retailerName: "Justcool.dk",
    }));
    const other: RankableProduct = {
      id: "dh-1",
      title: "Økologisk rødvin",
      description: "Vin",
      brand: "DH",
      category: "Vin",
      tags: ["vin"],
      priceOre: 17900,
      currency: "DKK",
      imageUrl: null,
      productUrl: "https://example.com/dh",
      inStock: true,
      isSample: false,
      retailerName: "DH Wines",
    };

    const ranked = rankProducts(
      [...sameShop, other],
      { query: "vin til mor" },
      3,
    );
    const retailers = new Set(ranked.map((r) => r.retailerName));
    expect(retailers.has("DH Wines")).toBe(true);
    expect(
      ranked.filter((r) => r.retailerName === "Justcool.dk").length,
    ).toBeLessThanOrEqual(2);
    expect(ranked).toHaveLength(3);
  });
});

describe("diversifyByRetailer", () => {
  it("caps items per retailer before filling", () => {
    const items = [
      { id: "1", retailerName: "A", score: 1 },
      { id: "2", retailerName: "A", score: 0.9 },
      { id: "3", retailerName: "A", score: 0.8 },
      { id: "4", retailerName: "B", score: 0.7 },
    ];
    const out = diversifyByRetailer(items, 3, 2);
    expect(out.map((i) => i.id)).toEqual(["1", "2", "4"]);
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
