import { normalizeText, tokenize } from "./normalize";
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

function tokenOverlapScore(queryTokens: string[], haystack: string): number {
  if (queryTokens.length === 0) return 0;
  const hay = normalizeText(haystack);
  let hits = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
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
 * Simple text relevance + budget ranking.
 * Does not invent products; only scores candidates already in the DB.
 */
export function rankProducts(
  products: RankableProduct[],
  preferences: GiftPreferences,
  limit = 8,
): RankedCandidate[] {
  const queryParts = [
    preferences.query,
    preferences.recipient,
    preferences.occasion,
    preferences.style,
  ]
    .filter(Boolean)
    .join(" ");

  const queryTokens = tokenize(queryParts);

  const scored = products.map((product) => {
    const blob = buildsSearchBlob(product);
    const textScore = tokenOverlapScore(queryTokens, blob);
    const titleBoost = tokenOverlapScore(queryTokens, product.title) * 0.35;
    const tagBoost =
      tokenOverlapScore(queryTokens, product.tags.join(" ")) * 0.2;
    const budget = budgetScore(
      product.priceOre,
      preferences.budgetMinOre,
      preferences.budgetMaxOre,
    );
    const stockBoost =
      product.inStock === true ? 0.05 : product.inStock === false ? -0.15 : 0;

    const score =
      textScore * 0.55 + titleBoost + tagBoost + budget * 0.25 + stockBoost;

    return { ...product, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "da"))
    .slice(0, limit);
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
