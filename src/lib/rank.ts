import {
  analyzeGiftIntent,
  genderMismatchPenalty,
  type GiftIntent,
} from "./gift-intent";
import { normalizeText, tokenizeForSearch } from "./normalize";
import type { GiftPreferences, RankedCandidate } from "./types";

export type RankableProduct = {
  id: string;
  title: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  tags: string[];
  priceOre: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string;
  inStock: boolean | null;
  isSample: boolean;
  retailerName: string;
};

/** Soft cap per shop in the final result list (diversity). */
export const MAX_PER_RETAILER = 2;

function buildsSearchBlob(product: RankableProduct): string {
  return [
    product.title,
    product.description ?? "",
    product.brand ?? "",
    product.category ?? "",
    product.tags.join(" "),
    product.retailerName,
  ].join(" ");
}

function productFocusBlob(product: RankableProduct): string {
  return [
    product.title,
    product.brand ?? "",
    product.category ?? "",
    product.tags.join(" "),
  ].join(" ");
}

function tokenOverlapScore(queryTokens: string[], haystack: string): number {
  if (queryTokens.length === 0) return 0;
  const hay = normalizeText(haystack);
  let hits = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

/** Whole-token / boundary-ish hit — avoids `vin` matching inside `vinter`. */
function tokenHit(hayNormalized: string, token: string): boolean {
  if (!token) return false;
  if (hayNormalized === token) return true;
  // space-delimited or start/end
  return (
    hayNormalized.startsWith(`${token} `) ||
    hayNormalized.endsWith(` ${token}`) ||
    hayNormalized.includes(` ${token} `) ||
    hayNormalized.includes(`-${token}`) ||
    hayNormalized.includes(`${token}-`)
  );
}

function interestMatchScore(
  interestTokens: string[],
  product: RankableProduct,
): number {
  if (interestTokens.length === 0) return 0.5;
  const focus = normalizeText(productFocusBlob(product));
  const title = normalizeText(product.title);
  let hits = 0;
  let titleHits = 0;
  for (const token of interestTokens) {
    if (tokenHit(focus, token) || focus.includes(token)) {
      hits += 1;
      if (tokenHit(title, token) || title.includes(token)) titleHits += 1;
    }
  }
  if (hits === 0) return 0;
  return hits / interestTokens.length + titleHits * 0.15;
}

function budgetScore(
  priceOre: number | null,
  min?: number,
  max?: number,
): number {
  if (min === undefined && max === undefined) return 0.5;
  if (priceOre === null) return 0.25; // unknown price — mild penalty, not exclusion
  if (min !== undefined && priceOre < min) {
    const distance = min - priceOre;
    return Math.max(0, 1 - distance / Math.max(min, 1));
  }
  if (max !== undefined && priceOre > max) {
    const distance = priceOre - max;
    return Math.max(0, 1 - distance / Math.max(max, 1));
  }
  return 1;
}

/**
 * Spread results across retailers: at most `maxPerRetailer` per shop,
 * filling remaining slots only if not enough shops.
 */
export function diversifyByRetailer<T extends { retailerName: string }>(
  ranked: T[],
  limit: number,
  maxPerRetailer = MAX_PER_RETAILER,
): T[] {
  if (ranked.length <= limit) {
    // Still cap per retailer when possible
    const counts = new Map<string, number>();
    const primary: T[] = [];
    const overflow: T[] = [];
    for (const item of ranked) {
      const key = item.retailerName || "unknown";
      const n = counts.get(key) ?? 0;
      if (n < maxPerRetailer) {
        primary.push(item);
        counts.set(key, n + 1);
      } else {
        overflow.push(item);
      }
    }
    if (primary.length >= limit) return primary.slice(0, limit);
    return [...primary, ...overflow].slice(0, limit);
  }

  const counts = new Map<string, number>();
  const selected: T[] = [];
  const deferred: T[] = [];

  for (const item of ranked) {
    const key = item.retailerName || "unknown";
    const n = counts.get(key) ?? 0;
    if (n < maxPerRetailer) {
      selected.push(item);
      counts.set(key, n + 1);
      if (selected.length >= limit) return selected;
    } else {
      deferred.push(item);
    }
  }

  for (const item of deferred) {
    if (selected.length >= limit) break;
    selected.push(item);
  }
  return selected;
}

function scoreProduct(
  product: RankableProduct,
  preferences: GiftPreferences,
  intent: GiftIntent,
): RankedCandidate {
  const blob = buildsSearchBlob(product);
  const queryTokens =
    intent.allTokens.length > 0
      ? intent.allTokens
      : tokenizeForSearch(
          [preferences.query, preferences.recipient, preferences.occasion, preferences.style]
            .filter(Boolean)
            .join(" "),
        );

  const interestScore = interestMatchScore(intent.interestTokens, product);
  const textScore = tokenOverlapScore(queryTokens, blob);
  const titleBoost = tokenOverlapScore(queryTokens, product.title) * 0.25;
  const tagBoost =
    tokenOverlapScore(queryTokens, product.tags.join(" ")) * 0.15;
  const budget = budgetScore(
    product.priceOre,
    preferences.budgetMinOre,
    preferences.budgetMaxOre,
  );
  const stockBoost =
    product.inStock === true ? 0.05 : product.inStock === false ? -0.15 : 0;
  const genderPenalty = genderMismatchPenalty(
    `${product.title} ${product.category ?? ""} ${product.tags.join(" ")}`,
    intent.recipientGender,
  );

  // Interest match dominates — without it, score stays low and gets filtered
  const score =
    interestScore * 0.5 +
    textScore * 0.2 +
    titleBoost +
    tagBoost +
    budget * 0.15 +
    stockBoost -
    genderPenalty;

  return { ...product, score };
}

/**
 * Text + interest + budget ranking with retailer diversity.
 * Does not invent products; only scores candidates already in the DB.
 */
export function rankProducts(
  products: RankableProduct[],
  preferences: GiftPreferences,
  limit = 8,
): RankedCandidate[] {
  const intent = analyzeGiftIntent(preferences);

  let pool = products;
  // When the user named a clear interest (vin, padel…), drop products with zero hit
  if (intent.interestTokens.length > 0) {
    const withInterest = products.filter(
      (p) => interestMatchScore(intent.interestTokens, p) > 0,
    );
    // Only apply hard filter when it still leaves a usable pool
    if (withInterest.length >= Math.min(3, products.length)) {
      pool = withInterest;
    } else if (withInterest.length > 0) {
      pool = withInterest;
    }
  }

  const scored = pool.map((product) =>
    scoreProduct(product, preferences, intent),
  );

  const sorted = scored.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title, "da"),
  );

  return diversifyByRetailer(sorted, limit, MAX_PER_RETAILER);
}

/** Filter candidates by optional hard budget bounds (soft ranking still applies). */
export function filterByBudget(
  products: RankableProduct[],
  minOre?: number,
  maxOre?: number,
): RankableProduct[] {
  if (minOre === undefined && maxOre === undefined) return products;

  return products.filter((p) => {
    if (p.priceOre === null) return true; // keep unknown prices
    if (minOre !== undefined && p.priceOre < minOre * 0.7) return false;
    if (maxOre !== undefined && p.priceOre > maxOre * 1.3) return false;
    return true;
  });
}
