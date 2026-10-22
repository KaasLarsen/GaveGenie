import {
  analyzeGiftIntent,
  genderMismatchPenalty,
  type GiftIntent,
} from "./gift-intent";
import { normalizeText, tokenizeForSearch } from "./normalize";
import { hasBookGiftIntent, isMassCatalogRetailer } from "./retailers";
import type { GiftPreferences, RankedCandidate } from "./types";

/** Score penalty for Booktok/Med24 when the query is not about books. */
export const MASS_CATALOG_PENALTY = 0.45;
/** Soft interest baseline when no interest/plan tokens exist (was 0.5). */
export const EMPTY_INTEREST_BASELINE = 0.15;
/** Max mass-catalog picks in the final list without book intent. */
export const MAX_MASS_CATALOG_WITHOUT_BOOK_INTENT = 1;

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

export type RankOptions = {
  /** Extra catalog queries from the AI/heuristic planner (boost matches). */
  plannedQueries?: string[];
  /** Terms that should not appear in good gifts (e.g. herre for a mom). */
  avoidTerms?: string[];
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
  if (interestTokens.length === 0) return EMPTY_INTEREST_BASELINE;
  const focus = normalizeText(productFocusBlob(product));
  const title = normalizeText(product.title);
  let hits = 0;
  let titleHits = 0;
  for (const token of interestTokens) {
    // Short tokens (vin) must use boundary hits — never substring (vinyl/vinter)
    const focusHit =
      token.length <= 3 ? tokenHit(focus, token) : tokenHit(focus, token) || focus.includes(token);
    if (!focusHit) continue;
    hits += 1;
    const titleHit =
      token.length <= 3 ? tokenHit(title, token) : tokenHit(title, token) || title.includes(token);
    if (titleHit) titleHits += 1;
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

/**
 * Retailer diversity plus a hard cap on mass-catalog shops (Booktok etc.)
 * unless the shopper clearly asked for books.
 */
export function diversifyFinderResults<T extends { retailerName: string }>(
  ranked: T[],
  limit: number,
  allowMassCatalog: boolean,
  maxPerRetailer = MAX_PER_RETAILER,
): T[] {
  if (allowMassCatalog) {
    return diversifyByRetailer(ranked, limit, maxPerRetailer);
  }

  const counts = new Map<string, number>();
  let massCount = 0;
  const selected: T[] = [];
  const deferred: T[] = [];

  for (const item of ranked) {
    const isMass = isMassCatalogRetailer(item.retailerName);
    if (isMass && massCount >= MAX_MASS_CATALOG_WITHOUT_BOOK_INTENT) {
      deferred.push(item);
      continue;
    }
    const key = item.retailerName || "unknown";
    const n = counts.get(key) ?? 0;
    if (n < maxPerRetailer) {
      selected.push(item);
      counts.set(key, n + 1);
      if (isMass) massCount += 1;
      if (selected.length >= limit) return selected;
    } else {
      deferred.push(item);
    }
  }

  for (const item of deferred) {
    if (selected.length >= limit) break;
    if (isMassCatalogRetailer(item.retailerName)) continue;
    selected.push(item);
  }
  return selected;
}

function avoidPenalty(product: RankableProduct, avoidTerms: string[]): number {
  if (avoidTerms.length === 0) return 0;
  const hay = normalizeText(productFocusBlob(product));
  let hits = 0;
  for (const term of avoidTerms) {
    const t = normalizeText(term);
    if (t.length > 1 && hay.includes(t)) hits += 1;
  }
  return hits > 0 ? Math.min(0.7, 0.35 * hits) : 0;
}

function plannedQueryBoost(
  product: RankableProduct,
  plannedQueries: string[],
): number {
  if (plannedQueries.length === 0) return 0;
  const focus = normalizeText(productFocusBlob(product));
  let best = 0;
  for (const q of plannedQueries) {
    const tokens = tokenizeForSearch(q);
    if (tokens.length === 0) continue;
    const overlap = tokenOverlapScore(tokens, focus);
    best = Math.max(best, overlap);
  }
  return best * 0.35;
}

function scoreProduct(
  product: RankableProduct,
  preferences: GiftPreferences,
  intent: GiftIntent,
  options: RankOptions,
): RankedCandidate {
  const blob = buildsSearchBlob(product);
  const plannedTokens = (options.plannedQueries ?? []).flatMap((q) =>
    tokenizeForSearch(q),
  );
  const interestTokens =
    intent.interestTokens.length > 0
      ? intent.interestTokens
      : [...new Set(plannedTokens)];

  const queryTokens =
    intent.allTokens.length > 0
      ? intent.allTokens
      : tokenizeForSearch(
          [preferences.query, preferences.recipient, preferences.occasion, preferences.style]
            .filter(Boolean)
            .join(" "),
        );

  const interestScore = interestMatchScore(interestTokens, product);
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
  const avoided = avoidPenalty(product, options.avoidTerms ?? []);
  const planBoost = plannedQueryBoost(product, options.plannedQueries ?? []);
  const allowMassCatalog = hasBookGiftIntent(
    preferences.query,
    ...(options.plannedQueries ?? []),
  );
  const massPenalty =
    !allowMassCatalog && isMassCatalogRetailer(product.retailerName)
      ? MASS_CATALOG_PENALTY
      : 0;

  // Interest match dominates — without it, score stays low and gets filtered
  const score =
    interestScore * 0.45 +
    textScore * 0.15 +
    titleBoost +
    tagBoost +
    planBoost +
    budget * 0.15 +
    stockBoost -
    genderPenalty -
    avoided -
    massPenalty;

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
  options: RankOptions = {},
): RankedCandidate[] {
  const intent = analyzeGiftIntent(preferences);
  const plannedTokens = [
    ...new Set(
      (options.plannedQueries ?? []).flatMap((q) => tokenizeForSearch(q)),
    ),
  ];
  const interestTokens =
    intent.interestTokens.length > 0
      ? intent.interestTokens
      : plannedTokens;

  let pool = products;
  // When we have clear interest / planned catalog terms, drop zero-hit products
  if (interestTokens.length > 0) {
    const withInterest = products.filter(
      (p) => interestMatchScore(interestTokens, p) > 0,
    );
    if (withInterest.length > 0) {
      pool = withInterest;
    }
  }

  // Hard-drop strong avoid hits when alternatives exist
  const avoid = options.avoidTerms ?? [];
  if (avoid.length > 0) {
    const cleaned = pool.filter((p) => avoidPenalty(p, avoid) < 0.35);
    if (cleaned.length >= Math.min(3, pool.length) || cleaned.length > 0) {
      pool = cleaned.length > 0 ? cleaned : pool;
    }
  }

  const allowMassCatalog = hasBookGiftIntent(
    preferences.query,
    ...(options.plannedQueries ?? []),
  );

  // Without book intent, drop mass-catalog filler when we have other options
  if (!allowMassCatalog) {
    const withoutMass = pool.filter(
      (p) => !isMassCatalogRetailer(p.retailerName),
    );
    if (withoutMass.length >= Math.min(3, pool.length) && withoutMass.length > 0) {
      pool = withoutMass;
    }
  }

  const scored = pool.map((product) =>
    scoreProduct(product, preferences, intent, options),
  );

  const sorted = scored.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title, "da"),
  );

  return diversifyFinderResults(
    sorted,
    limit,
    allowMassCatalog,
    MAX_PER_RETAILER,
  );
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
