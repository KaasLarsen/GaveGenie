import { prisma } from "./db";
import { planGiftSearch } from "./ai/query-planner";
import { generateDanishWhys, isOpenAiConfigured } from "./ai/openai";
import { dkkToOre, tokenizeForSearch } from "./normalize";
import { filterByBudget, rankProducts, type RankableProduct } from "./rank";
import type { GiftPreferencesInput } from "./schema";
import {
  buildBudgetWhere,
  buildTsQueryString,
  CANDIDATE_LIMIT,
  findProductIdsByFts,
  MIN_RELEVANCE_SCORE,
  preferenceSearchTokens,
} from "./search";
import type { GiftPreferences, GiftRecommendation } from "./types";

export { preferenceSearchTokens } from "./search";
/** @deprecated Use buildBudgetWhere — kept for callers/tests during transition */
export { buildBudgetWhere as buildCandidateWhere } from "./search";

type DbProduct = {
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
  retailer: { name: string };
};

export function toPreferences(input: GiftPreferencesInput): GiftPreferences {
  return {
    query: input.query,
    recipient: input.recipient || undefined,
    occasion: input.occasion || undefined,
    style: input.style || undefined,
    budgetMinOre:
      input.budgetMinDkk !== undefined
        ? (dkkToOre(input.budgetMinDkk) ?? undefined)
        : undefined,
    budgetMaxOre:
      input.budgetMaxDkk !== undefined
        ? (dkkToOre(input.budgetMaxDkk) ?? undefined)
        : undefined,
  };
}

function toRankable(p: DbProduct): RankableProduct {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    brand: p.brand,
    category: p.category,
    tags: p.tags,
    priceOre: p.priceOre,
    currency: p.currency,
    imageUrl: p.imageUrl,
    productUrl: p.productUrl,
    inStock: p.inStock,
    isSample: p.isSample,
    retailerName: p.retailer.name,
  };
}

/**
 * Load products for one catalog query string via FTS.
 */
async function loadByQuery(
  query: string,
  preferences: GiftPreferences,
  excludeSamples: boolean,
  limit: number,
): Promise<DbProduct[]> {
  const tokens = tokenizeForSearch(query);
  const tsQuery = buildTsQueryString(tokens);
  if (!tsQuery) return [];

  const ids = await findProductIdsByFts({
    tsQuery,
    excludeSamples,
    preferences,
    limit,
  });
  if (ids.length === 0) return [];

  const found = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { retailer: true },
  });
  const byId = new Map(found.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/**
 * Merge products from several planner queries (vinbot-style multi-search).
 * Earlier queries win ordering when deduping.
 */
export function mergeProductsByQueryOrder(
  batches: DbProduct[][],
): DbProduct[] {
  const seen = new Set<string>();
  const merged: DbProduct[] = [];
  for (const batch of batches) {
    for (const p of batch) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }
  }
  return merged;
}

/**
 * Retrieve candidates: AI/heuristic query plan → FTS → rank → OpenAI whys.
 * Never invents products — all IDs must exist in the database.
 */
export async function findGifts(
  input: GiftPreferencesInput,
): Promise<{
  recommendations: GiftRecommendation[];
  usedAi: boolean;
  candidateCount: number;
  searchQueries?: string[];
}> {
  const preferences = toPreferences(input);

  const liveCount = await prisma.product.count({
    where: { isSample: false },
  });
  const excludeSamples = liveCount > 0;

  const { plan, source: planSource } = await planGiftSearch(preferences);

  // Soft-apply planner budget if the user did not set one
  const prefsWithBudget: GiftPreferences = {
    ...preferences,
    budgetMaxOre:
      preferences.budgetMaxOre ??
      (plan.budgetMaxDkk != null
        ? (dkkToOre(plan.budgetMaxDkk) ?? undefined)
        : undefined),
  };

  const perQueryLimit = Math.max(
    80,
    Math.floor(CANDIDATE_LIMIT / Math.max(1, plan.searchQueries.length)),
  );

  const batches = await Promise.all(
    plan.searchQueries.map((q) =>
      loadByQuery(q, prefsWithBudget, excludeSamples, perQueryLimit),
    ),
  );

  let products = mergeProductsByQueryOrder(batches);

  // Fallback: original preference tokens if planner queries miss
  if (products.length === 0) {
    const tokens = preferenceSearchTokens(preferences);
    const tsQuery = buildTsQueryString(tokens);
    if (tsQuery) {
      const ids = await findProductIdsByFts({
        tsQuery,
        excludeSamples,
        preferences: prefsWithBudget,
        limit: CANDIDATE_LIMIT,
      });
      if (ids.length > 0) {
        const found = await prisma.product.findMany({
          where: { id: { in: ids } },
          include: { retailer: true },
        });
        const byId = new Map(found.map((p) => [p.id, p]));
        products = ids
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
      }
    }
  }

  // Last resort: soft budget only
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: buildBudgetWhere(prefsWithBudget, { excludeSamples }),
      include: { retailer: true },
      take: CANDIDATE_LIMIT,
      orderBy: { updatedAt: "desc" },
    });
  }

  const rankable = products.map(toRankable);
  const filtered = filterByBudget(
    rankable,
    prefsWithBudget.budgetMinOre,
    prefsWithBudget.budgetMaxOre,
  );

  const ranked = rankProducts(filtered, preferences, 8, {
    plannedQueries: plan.searchQueries,
    avoidTerms: plan.avoidTerms,
  }).filter((c) => c.score >= MIN_RELEVANCE_SCORE);

  // Re-validate IDs against DB (defense in depth)
  const ids = ranked.map((r) => r.id);
  const existing = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const validated = ranked.filter((r) => existingIds.has(r.id));

  let usedAi = planSource === "openai";
  let whyMap = new Map<string, string>();

  if (isOpenAiConfigured() && validated.length > 0) {
    try {
      whyMap = await generateDanishWhys(preferences, validated);
      usedAi = true;
    } catch {
      // Keep planner AI flag if planning succeeded
    }
  }

  const recommendations: GiftRecommendation[] = validated.map((c) => ({
    productId: c.id,
    title: c.title,
    description: c.description,
    brand: c.brand,
    category: c.category,
    priceOre: c.priceOre,
    currency: c.currency,
    imageUrl: c.imageUrl,
    productUrl: c.productUrl,
    inStock: c.inStock,
    isSample: c.isSample,
    retailerName: c.retailerName,
    why:
      whyMap.get(c.id) ||
      `${c.title} matcher din søgning “${preferences.query}”.${
        c.isSample ? " (eksempelprodukt til udvikling)" : ""
      }`,
    score: c.score,
  }));

  return {
    recommendations,
    usedAi,
    candidateCount: filtered.length,
    searchQueries: plan.searchQueries,
  };
}
