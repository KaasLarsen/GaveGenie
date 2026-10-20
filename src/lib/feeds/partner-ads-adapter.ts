import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { assertNormalizedProduct, dkkToOre } from "../normalize";
import type { NormalizedProduct } from "../types";
import type { FeedAdapter, FeedLoadResult } from "./types";
import {
  readFeedCache,
  readFeedCacheIgnoringTtl,
  writeFeedCache,
} from "./feed-cache";
import {
  buildPartnerAdsFeedUrl,
  partnerAdsProviderKey,
  type PartnerAdsFeedConfig,
} from "./partner-ads-registry";

/** Raw fields from a Partner Ads `<produkt>` node (stringified by the parser). */
export type PartnerAdsRawProduct = {
  forhandler?: string;
  kategorinavn?: string;
  brand?: string;
  produktnavn?: string;
  produktid?: string;
  ean?: string;
  beskrivelse?: string;
  nypris?: string;
  glpris?: string;
  fragtomk?: string;
  lagerantal?: string;
  leveringstid?: string;
  size?: string;
  color?: string;
  gender?: string;
  billedurl?: string;
  vareurl?: string;
};

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  // Partner Ads feeds are flat string fields; keep numbers as strings for parsing
  parseTagValue: false,
  isArray: (name) => name === "produkt",
});

export function slugifyRetailer(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "og")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ukendt-forhandler";
}

export function parseStockStatus(lagerantal: string | undefined): boolean | null {
  if (lagerantal === undefined || lagerantal === null || lagerantal === "") {
    return null;
  }
  const raw = lagerantal.trim().toLowerCase();
  if (!raw) return null;
  if (
    raw === "in stock" ||
    raw === "på lager" ||
    raw === "pa lager" ||
    raw === "yes" ||
    raw === "ja" ||
    raw === "true"
  ) {
    return true;
  }
  if (
    raw === "out of stock" ||
    raw === "ikke på lager" ||
    raw === "ikke pa lager" ||
    raw === "no" ||
    raw === "nej" ||
    raw === "false" ||
    raw === "0"
  ) {
    return false;
  }
  const asNum = Number(raw.replace(",", "."));
  if (!Number.isNaN(asNum)) {
    return asNum > 0;
  }
  return null;
}

function textField(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function fallbackExternalId(raw: PartnerAdsRawProduct): string {
  const url = textField(raw.vareurl);
  const seed = url || JSON.stringify(raw);
  return `hash-${createHash("sha1").update(seed).digest("hex").slice(0, 16)}`;
}

/**
 * Map a single Partner Ads product node to NormalizedProduct.
 * Returns null when required fields (title + product URL) are missing.
 */
export function mapPartnerAdsProduct(
  raw: PartnerAdsRawProduct,
  provider: string,
): NormalizedProduct | null {
  const title = textField(raw.produktnavn);
  const productUrlRaw = textField(raw.vareurl);
  if (!title || !productUrlRaw) return null;

  const productUrl = decodeHtmlEntities(productUrlRaw);
  const retailerName = textField(raw.forhandler) || "Ukendt forhandler";
  const externalId =
    textField(raw.produktid) ||
    textField(raw.ean) ||
    fallbackExternalId(raw);

  const priceRaw = textField(raw.nypris);
  const priceDkk = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
  const priceOre =
    priceDkk !== null && !Number.isNaN(priceDkk) ? dkkToOre(priceDkk) : null;

  const imageUrl = textField(raw.billedurl);
  const tags = [raw.color, raw.gender, raw.size]
    .map((t) => textField(t))
    .filter((t): t is string => Boolean(t));

  return assertNormalizedProduct({
    provider,
    externalId,
    retailerSlug: slugifyRetailer(retailerName),
    retailerName,
    title,
    description: textField(raw.beskrivelse),
    brand: textField(raw.brand),
    category: textField(raw.kategorinavn),
    tags,
    priceOre,
    currency: "DKK",
    imageUrl: imageUrl || undefined,
    productUrl,
    inStock: parseStockStatus(textField(raw.lagerantal)),
    isSample: false,
  });
}

/**
 * Parse Partner Ads XML document (already decoded to a JS string) into products.
 */
export function parsePartnerAdsXml(
  xml: string,
  provider: string,
): NormalizedProduct[] {
  const parsed = xmlParser.parse(xml) as {
    produkter?: { produkt?: PartnerAdsRawProduct[] };
  };

  const nodes = parsed.produkter?.produkt ?? [];
  const products: NormalizedProduct[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const mapped = mapPartnerAdsProduct(node, provider);
    if (!mapped) continue;
    // Deduplicate identical externalIds within one feed (keep first)
    if (seen.has(mapped.externalId)) continue;
    seen.add(mapped.externalId);
    products.push(mapped);
  }

  return products;
}

export type PartnerAdsAdapterOptions = {
  /** Override fetch (tests). Default: global fetch */
  fetchFn?: typeof fetch;
  /** Inject preloaded XML instead of fetching (tests) */
  xmlOverride?: string;
  /** Bypass disk cache and conditional GET */
  forceRefresh?: boolean;
  /** Override cache directory (tests) */
  cacheDir?: string;
};

export type PartnerAdsLoadMeta = {
  /** Where the XML came from for this load */
  cacheHit: "memory" | "disk" | "http-304" | "http-200" | "override";
};

/**
 * Live Partner Ads feed adapter — one instance per shop/feed.
 * Uses on-disk XML cache (TTL) so we do not re-download large feeds constantly.
 * Gift search never calls this — only explicit import jobs do.
 */
export class PartnerAdsAdapter implements FeedAdapter {
  readonly provider: string;
  readonly feed: PartnerAdsFeedConfig;
  private readonly fetchFn: typeof fetch;
  private readonly xmlOverride?: string;
  private readonly forceRefresh: boolean;
  private readonly cacheDir?: string;
  lastLoadMeta: PartnerAdsLoadMeta | null = null;

  constructor(feed: PartnerAdsFeedConfig, options: PartnerAdsAdapterOptions = {}) {
    this.feed = feed;
    this.provider = partnerAdsProviderKey(feed.feedId);
    this.fetchFn = options.fetchFn ?? fetch;
    this.xmlOverride = options.xmlOverride;
    this.forceRefresh = Boolean(options.forceRefresh);
    this.cacheDir = options.cacheDir;
  }

  async load(): Promise<FeedLoadResult> {
    const source = buildPartnerAdsFeedUrl(this.feed);
    let xml: string;
    let cacheHit: PartnerAdsLoadMeta["cacheHit"] = "http-200";

    if (this.xmlOverride !== undefined) {
      xml = this.xmlOverride;
      cacheHit = "override";
    } else {
      const cached = await readFeedCache(this.feed.feedId, {
        cacheDir: this.cacheDir,
        force: this.forceRefresh,
      });

      if (cached) {
        xml = cached.xml;
        cacheHit = "disk";
      } else {
        const headers: Record<string, string> = {
          Accept: "application/xml, text/xml, text/html, */*",
          "User-Agent": "GaveGenieFeedImporter/1.0",
        };

        // Conditional GET when stale cache exists (save Partner Ads bandwidth)
        const softMeta = await readFeedCacheIgnoringTtl(this.feed.feedId, {
          cacheDir: this.cacheDir,
        });
        if (softMeta?.meta.etag) {
          headers["If-None-Match"] = softMeta.meta.etag;
        }
        if (softMeta?.meta.lastModified) {
          headers["If-Modified-Since"] = softMeta.meta.lastModified;
        }

        const response = await this.fetchFn(source, { headers });

        if (response.status === 304 && softMeta) {
          xml = softMeta.xml;
          cacheHit = "http-304";
          await writeFeedCache(
            this.feed.feedId,
            xml,
            {
              fetchedAt: new Date().toISOString(),
              etag: softMeta.meta.etag,
              lastModified: softMeta.meta.lastModified,
              sourceUrl: source,
            },
            { cacheDir: this.cacheDir },
          );
        } else if (!response.ok) {
          throw new Error(
            `Partner Ads feed ${this.feed.feedId} (${this.feed.label}) HTTP ${response.status}`,
          );
        } else {
          const buffer = Buffer.from(await response.arrayBuffer());
          xml = buffer.toString("latin1");
          cacheHit = "http-200";
          await writeFeedCache(
            this.feed.feedId,
            xml,
            {
              fetchedAt: new Date().toISOString(),
              etag: response.headers.get("etag") ?? undefined,
              lastModified:
                response.headers.get("last-modified") ?? undefined,
              sourceUrl: source,
            },
            { cacheDir: this.cacheDir },
          );
        }
      }
    }

    const products = parsePartnerAdsXml(xml, this.provider);
    if (products.length === 0) {
      throw new Error(
        `Partner Ads feed ${this.feed.feedId} (${this.feed.label}) returned 0 products`,
      );
    }

    this.lastLoadMeta = { cacheHit };
    return {
      provider: this.provider,
      source:
        cacheHit === "disk" || cacheHit === "http-304"
          ? `${source}#cache=${cacheHit}`
          : source,
      products,
      isDevelopmentData: false,
    };
  }
}
