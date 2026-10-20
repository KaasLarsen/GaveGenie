import { prisma } from "./db";
import { generateDanishWhys, isOpenAiConfigured } from "./ai/openai";
import { dkkToOre } from "./normalize";
import { filterByBudget, rankProducts } from "./rank";
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

/**
 * Retrieve candidates via Postgres FTS, rank by text+budget, optionally enrich with OpenAI whys.
 * Never invents products — all IDs must exist in the database.
 */
export async function findGifts(
  input: GiftPreferencesInput,
): Promise<{
  recommendations: GiftRecommendation[];
  usedAi: boolean;
  candidateCount: number;
}> {
  const preferences = toPreferences(input);

  const liveCount = await prisma.product.count({
    where: { isSample: false },
  });
  const excludeSamples = liveCount > 0;
  const tokens = preferenceSearchTokens(preferences);
  const tsQuery = buildTsQueryString(tokens);

  let products: Array<{
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
  }> = [];

  if (tsQuery) {
    const ids = await findProductIdsByFts({
      tsQuery,
      excludeSamples,
      preferences,
      limit: CANDIDATE_LIMIT,
    });

    if (ids.length > 0) {
      const found = await prisma.product.findMany({
        where: { id: { in: ids } },
        include: { retailer: true },
      });
      const byId = new Map(found.map((p) => [p.id, p]));
      // Preserve FTS rank order
      products = ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    }
  }

  // Fallback: FTS too strict / no tokens — soft budget only (still prefer live catalog)
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: buildBudgetWhere(preferences, { excludeSamples }),
      include: { retailer: true },
      take: CANDIDATE_LIMIT,
      orderBy: { updatedAt: "desc" },
    });
  }

  const rankable = products.map((p) => ({
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
  }));

  const filtered = filterByBudget(
    rankable,
    preferences.budgetMinOre,
    preferences.budgetMaxOre,
  );

  const ranked = rankProducts(filtered, preferences, 6).filter(
    (c) => c.score >= MIN_RELEVANCE_SCORE,
  );

  // Re-validate IDs against DB (defense in depth)
  const ids = ranked.map((r) => r.id);
  const existing = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const validated = ranked.filter((r) => existingIds.has(r.id));

  let usedAi = false;
  let whyMap = new Map<string, string>();

  if (isOpenAiConfigured() && validated.length > 0) {
    try {
      whyMap = await generateDanishWhys(preferences, validated);
      usedAi = true;
    } catch {
      // Fall through to template whys — never invent products on AI failure
      usedAi = false;
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
  };
}
