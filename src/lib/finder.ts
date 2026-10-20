import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { generateDanishWhys, isOpenAiConfigured } from "./ai/openai";
import { dkkToOre, tokenize } from "./normalize";
import { filterByBudget, rankProducts } from "./rank";
import type { GiftPreferencesInput } from "./schema";
import type { GiftPreferences, GiftRecommendation } from "./types";

/** Max products pulled from DB before in-memory ranking. */
const CANDIDATE_LIMIT = 800;

/** Soft budget padding (same spirit as filterByBudget). */
const BUDGET_SOFT_MIN = 0.7;
const BUDGET_SOFT_MAX = 1.3;

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

/** Build searchable query tokens from gift preferences. */
export function preferenceSearchTokens(preferences: GiftPreferences): string[] {
  const blob = [
    preferences.query,
    preferences.recipient,
    preferences.occasion,
    preferences.style,
  ]
    .filter(Boolean)
    .join(" ");
  const tokens = tokenize(blob);
  // Prefer longer tokens; cap to keep OR clauses manageable
  return [...new Set(tokens)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
}

/**
 * Prisma where for token prefilter + optional sample exclusion + soft budget.
 * Exported for unit tests.
 */
export function buildCandidateWhere(
  preferences: GiftPreferences,
  opts: { excludeSamples: boolean; tokens: string[] },
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (opts.excludeSamples) {
    and.push({ isSample: false });
  }

  if (opts.tokens.length > 0) {
    and.push({
      OR: opts.tokens.flatMap((token) => [
        { title: { contains: token, mode: "insensitive" as const } },
        { description: { contains: token, mode: "insensitive" as const } },
        { brand: { contains: token, mode: "insensitive" as const } },
        { category: { contains: token, mode: "insensitive" as const } },
      ]),
    });
  }

  if (preferences.budgetMinOre !== undefined) {
    and.push({
      OR: [
        { priceOre: null },
        {
          priceOre: {
            gte: Math.floor(preferences.budgetMinOre * BUDGET_SOFT_MIN),
          },
        },
      ],
    });
  }

  if (preferences.budgetMaxOre !== undefined) {
    and.push({
      OR: [
        { priceOre: null },
        {
          priceOre: {
            lte: Math.ceil(preferences.budgetMaxOre * BUDGET_SOFT_MAX),
          },
        },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
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

  const liveCount = await prisma.product.count({
    where: { isSample: false },
  });
  const excludeSamples = liveCount > 0;
  const tokens = preferenceSearchTokens(preferences);

  let products = await prisma.product.findMany({
    where: buildCandidateWhere(preferences, { excludeSamples, tokens }),
    include: { retailer: true },
    take: CANDIDATE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });

  // Fallback: if token filter was too strict, broaden (still exclude samples when live)
  if (products.length === 0 && tokens.length > 0) {
    products = await prisma.product.findMany({
      where: buildCandidateWhere(preferences, {
        excludeSamples,
        tokens: [],
      }),
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
