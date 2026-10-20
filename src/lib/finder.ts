import { prisma } from "./db";
import { generateDanishWhys, isOpenAiConfigured } from "./ai/openai";
import { dkkToOre } from "./normalize";
import { filterByBudget, rankProducts } from "./rank";
import type { GiftPreferencesInput } from "./schema";
import type { GiftPreferences, GiftRecommendation } from "./types";
import { preferenceWhy } from "./why";

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
 * Retrieve candidates from DB, rank by text+budget, optionally enrich with OpenAI whys.
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

  const products = await prisma.product.findMany({
    include: { retailer: true },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });

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

  const ranked = rankProducts(filtered, preferences, 6);

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
    priceOre: c.priceOre,
    currency: c.currency,
    imageUrl: c.imageUrl,
    productUrl: c.productUrl,
    inStock: c.inStock,
    isSample: c.isSample,
    retailerName: c.retailerName,
    why:
      whyMap.get(c.id) ||
      preferenceWhy(preferences, c.isSample),
    score: c.score,
  }));

  return {
    recommendations,
    usedAi,
    candidateCount: filtered.length,
  };
}
