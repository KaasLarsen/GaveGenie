import { describe, expect, it } from "vitest";
import {
  diversifyByRetailer,
  diversifyFinderResults,
  filterByBudget,
  rankProducts,
  type RankableProduct,
} from "./rank";
import { MIN_RELEVANCE_SCORE } from "./search";

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

  it("prefers relevant gifts over Booktok filler for non-book queries", () => {
    const mixed: RankableProduct[] = [
      {
        id: "coffee",
        title: "Pour-over kaffekande",
        description: "Kaffebrygger til hjemmet",
        brand: "Brew",
        category: "Køkken",
        tags: ["kaffe"],
        priceOre: 34900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/coffee",
        inStock: true,
        isSample: false,
        retailerName: "Demo Bolig",
      },
      {
        id: "book-a",
        title: "Beststellerroman om kærlighed",
        description: "En roman til hyggestunden",
        brand: "Gyldendal",
        category: "Bøger",
        tags: ["roman", "bog"],
        priceOre: 19900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/book-a",
        inStock: true,
        isSample: false,
        retailerName: "Booktok.dk",
      },
      {
        id: "book-b",
        title: "Krimi-thriller paperback",
        description: "Spændende krimi",
        brand: "Forum",
        category: "Bøger",
        tags: ["krimi", "bog"],
        priceOre: 14900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/book-b",
        inStock: true,
        isSample: false,
        retailerName: "Booktok.dk",
      },
    ];

    const ranked = rankProducts(mixed, { query: "kaffe til mor" }, 3, {
      plannedQueries: ["kaffe", "kaffekande"],
    });
    expect(ranked[0]?.id).toBe("coffee");
    expect(ranked.filter((r) => r.retailerName.includes("Booktok")).length).toBe(
      0,
    );
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(MIN_RELEVANCE_SCORE);
  });

  it("keeps KÆRE BØRN out of adult mormor searches", () => {
    const mixed: RankableProduct[] = [
      {
        id: "kids-music",
        title: "Musiklegetøj xylofon",
        description: "Legetøj til børn",
        brand: "Kids",
        category: "Legetøj",
        tags: ["seo:modtager:barn", "musik", "legetøj"],
        priceOre: 19900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/kids",
        inStock: true,
        isSample: false,
        retailerName: "KÆRE BØRN",
      },
      {
        id: "headphones",
        title: "Trådløse høretelefoner",
        description: "Musik i øret",
        brand: "Sound",
        category: "Elektronik",
        tags: ["musik", "høretelefoner"],
        priceOre: 49900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/hp",
        inStock: true,
        isSample: false,
        retailerName: "Justcool.dk",
      },
      {
        id: "yarn",
        title: "Merino garn nøgler",
        description: "Blødt garn til strik",
        brand: "Wool",
        category: "Hobby",
        tags: ["garn", "strikke"],
        priceOre: 8900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/yarn",
        inStock: true,
        isSample: false,
        retailerName: "Demo Bolig",
      },
    ];

    const ranked = rankProducts(
      mixed,
      { query: "mormor som elsker musik og at strikke" },
      4,
      { plannedQueries: ["musik", "strikke", "garn"] },
    );
    expect(ranked.every((r) => r.retailerName !== "KÆRE BØRN")).toBe(true);
    expect(ranked.some((r) => r.id === "headphones" || r.id === "yarn")).toBe(
      true,
    );
    const retailers = new Set(ranked.map((r) => r.retailerName));
    expect(retailers.size).toBeGreaterThanOrEqual(2);
  });

  it("still allows Booktok when the query asks for a book", () => {
    const mixed: RankableProduct[] = [
      {
        id: "mug",
        title: "Keramikkrus",
        description: "Krus",
        brand: "Studio",
        category: "Bolig",
        tags: ["krus"],
        priceOre: 14900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/mug",
        inStock: true,
        isSample: false,
        retailerName: "Demo Bolig",
      },
      {
        id: "roman",
        title: "Ny roman til far",
        description: "Spændende roman",
        brand: "Gyldendal",
        category: "Bøger",
        tags: ["roman", "bog"],
        priceOre: 22900,
        currency: "DKK",
        imageUrl: null,
        productUrl: "https://example.com/roman",
        inStock: true,
        isSample: false,
        retailerName: "Booktok.dk",
      },
    ];

    const ranked = rankProducts(mixed, { query: "roman til far" }, 2, {
      plannedQueries: ["roman", "bog"],
    });
    expect(ranked.some((r) => r.id === "roman")).toBe(true);
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
  it("caps items per retailer and does not backfill the same shop", () => {
    const items = [
      { id: "1", retailerName: "A", score: 1 },
      { id: "2", retailerName: "A", score: 0.9 },
      { id: "3", retailerName: "A", score: 0.8 },
      { id: "4", retailerName: "B", score: 0.7 },
    ];
    const out = diversifyByRetailer(items, 3, 2);
    expect(out.map((i) => i.id)).toEqual(["1", "2", "4"]);
  });

  it("returns fewer results rather than filling from one retailer", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `only-${i}`,
      retailerName: "KÆRE BØRN",
      score: 1 - i * 0.01,
    }));
    const out = diversifyByRetailer(items, 8, 2);
    expect(out).toHaveLength(2);
  });
});

describe("diversifyFinderResults", () => {
  it("caps mass-catalog shops without book intent", () => {
    const items = [
      { id: "b1", retailerName: "Booktok.dk", score: 1 },
      { id: "b2", retailerName: "Booktok.dk", score: 0.95 },
      { id: "g1", retailerName: "Demo Bolig", score: 0.9 },
      { id: "g2", retailerName: "Demo Outdoor", score: 0.85 },
    ];
    const out = diversifyFinderResults(items, 3, false);
    expect(out.filter((i) => i.retailerName.includes("Booktok"))).toHaveLength(
      1,
    );
    expect(out.map((i) => i.id)).toEqual(["b1", "g1", "g2"]);
  });

  it("does not special-cap mass catalogs with book intent", () => {
    const items = [
      { id: "b1", retailerName: "Booktok.dk", score: 1 },
      { id: "b2", retailerName: "Booktok.dk", score: 0.95 },
      { id: "g1", retailerName: "Demo Bolig", score: 0.9 },
    ];
    const out = diversifyFinderResults(items, 3, true);
    expect(out.filter((i) => i.retailerName.includes("Booktok")).length).toBe(2);
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
