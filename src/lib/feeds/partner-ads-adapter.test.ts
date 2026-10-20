import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  mapPartnerAdsProduct,
  parsePartnerAdsXml,
  parseStockStatus,
  PartnerAdsAdapter,
  slugifyRetailer,
} from "./partner-ads-adapter";
import { PARTNER_ADS_FEEDS } from "./partner-ads-registry";

const fixtureXml = readFileSync(
  path.join(process.cwd(), "data/feeds/partner-ads-fixture.xml"),
  "utf8",
);

describe("slugifyRetailer", () => {
  it("slugifies Danish retailer names", () => {
    expect(slugifyRetailer("Justcool.dk")).toBe("justcool-dk");
    expect(slugifyRetailer("KÆRE BØRN")).toBe("kaere-boern");
  });
});

describe("parseStockStatus", () => {
  it("maps common stock strings", () => {
    expect(parseStockStatus("In stock")).toBe(true);
    expect(parseStockStatus("0")).toBe(false);
    expect(parseStockStatus("12")).toBe(true);
    expect(parseStockStatus("")).toBe(null);
    expect(parseStockStatus(undefined)).toBe(null);
  });
});

describe("mapPartnerAdsProduct", () => {
  it("maps fields and decodes affiliate URL entities", () => {
    const product = mapPartnerAdsProduct(
      {
        forhandler: "Justcool.dk",
        kategorinavn: "Isskøjter",
        brand: "SFR",
        produktnavn: "SFR Galaxy",
        produktid: "sfr-1",
        beskrivelse: "En skøjte",
        nypris: "439.00",
        lagerantal: "In stock",
        color: "Sort",
        size: "43",
        gender: "Unisex",
        billedurl: "https://justcool.dk/img.jpg",
        vareurl:
          "https://www.partner-ads.com/dk/klikbanner.php?bannerid=92392&amp;partnerid=57802&amp;htmlurl=https://justcool.dk/x",
      },
      "partner-ads-2437",
    );

    expect(product).not.toBeNull();
    expect(product!.provider).toBe("partner-ads-2437");
    expect(product!.externalId).toBe("sfr-1");
    expect(product!.priceOre).toBe(43900);
    expect(product!.isSample).toBe(false);
    expect(product!.inStock).toBe(true);
    expect(product!.tags).toEqual(["Sort", "Unisex", "43"]);
    expect(product!.productUrl).toContain("bannerid=92392&partnerid=57802");
    expect(product!.productUrl).not.toContain("&amp;");
  });

  it("returns null when title is missing", () => {
    expect(
      mapPartnerAdsProduct(
        {
          produktid: "x",
          vareurl: "https://example.com/x",
        },
        "partner-ads-1",
      ),
    ).toBeNull();
  });
});

describe("parsePartnerAdsXml", () => {
  it("parses fixture and skips invalid products", () => {
    const products = parsePartnerAdsXml(fixtureXml, "partner-ads-2437");
    expect(products).toHaveLength(2);
    expect(products[0].title).toContain("Kunstskøjte");
    expect(products[0].priceOre).toBe(43900);
    expect(products[0].inStock).toBe(true);
    expect(products[1].title).toContain("plakat");
    expect(products[1].priceOre).toBe(19950);
    expect(products[1].inStock).toBe(false);
    expect(products.every((p) => p.isSample === false)).toBe(true);
  });
});

describe("PartnerAdsAdapter", () => {
  it("loads from xmlOverride without network", async () => {
    const feed = PARTNER_ADS_FEEDS[0];
    const adapter = new PartnerAdsAdapter(feed, { xmlOverride: fixtureXml });
    const result = await adapter.load();

    expect(result.isDevelopmentData).toBe(false);
    expect(result.provider).toBe(`partner-ads-${feed.feedId}`);
    expect(result.products.length).toBe(2);
    expect(result.source).toContain(`feedid=${feed.feedId}`);
  });
});
