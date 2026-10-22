import type { NormalizedProduct } from "./types";

/** Convert DKK (whole kroner or decimal) to øre. Returns null for null/undefined. */
export function dkkToOre(dkk: number | null | undefined): number | null {
  if (dkk === null || dkk === undefined || Number.isNaN(dkk)) return null;
  return Math.round(dkk * 100);
}

export function oreToDkk(ore: number | null | undefined): number | null {
  if (ore === null || ore === undefined) return null;
  return ore / 100;
}

export function formatPriceDkk(
  priceOre: number | null | undefined,
  currency = "DKK",
): string {
  if (priceOre === null || priceOre === undefined) {
    return "Pris ukendt";
  }
  const dkk = priceOre / 100;
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(dkk);
}

/** Collapse whitespace and lowercase for matching. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((t) => t.length > 1);
}

/** Common Danish / gift-query noise tokens dropped before FTS and ranking. */
export const DANISH_SEARCH_STOPWORDS = new Set([
  "til",
  "der",
  "den",
  "det",
  "de",
  "en",
  "et",
  "og",
  "eller",
  "som",
  "at",
  "pa",
  "af",
  "for",
  "med",
  "er",
  "har",
  "jeg",
  "du",
  "vi",
  "i",
  "om",
  "fra",
  "din",
  "dit",
  "dine",
  "min",
  "mit",
  "mine",
  "gave",
  "gaven",
  "gaver",
  "lidt",
  "noget",
  "meget",
  "ogsa",
  "kan",
  "skal",
  "vil",
  "mere",
  "bare",
  "han",
  "hun",
  "ham",
  "hende",
  "man",
  "sig",
  "sin",
  "sit",
  "sine",
]);

/** Tokenize for gift search: normalize + drop Danish stopwords. */
export function tokenizeForSearch(value: string): string[] {
  return tokenize(value).filter((t) => !DANISH_SEARCH_STOPWORDS.has(t));
}

/** Ensure required fields and sane defaults on a normalized product. */
export function assertNormalizedProduct(
  product: NormalizedProduct,
): NormalizedProduct {
  if (!product.provider?.trim()) {
    throw new Error("Normalized product missing provider");
  }
  if (!product.externalId?.trim()) {
    throw new Error("Normalized product missing externalId");
  }
  if (!product.title?.trim()) {
    throw new Error("Normalized product missing title");
  }
  if (!product.productUrl?.trim()) {
    throw new Error("Normalized product missing productUrl");
  }
  if (!product.retailerSlug?.trim() || !product.retailerName?.trim()) {
    throw new Error("Normalized product missing retailer");
  }

  return {
    ...product,
    tags: product.tags ?? [],
    currency: product.currency || "DKK",
    priceOre: product.priceOre ?? null,
    inStock: product.inStock ?? null,
    isSample: Boolean(product.isSample),
  };
}
