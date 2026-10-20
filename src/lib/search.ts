import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { analyzeGiftIntent } from "./gift-intent";
import { normalizeText } from "./normalize";
import type { GiftPreferences } from "./types";

export { DANISH_SEARCH_STOPWORDS } from "./normalize";

/** Soft budget padding (same spirit as filterByBudget). */
export const BUDGET_SOFT_MIN = 0.7;
export const BUDGET_SOFT_MAX = 1.3;

/** Max products pulled from FTS / fallback before in-memory ranking. */
export const CANDIDATE_LIMIT = 300;

/**
 * Minimum in-memory rank score to keep a recommendation.
 * Requires real interest overlap — budget-only hits stay below this.
 */
export const MIN_RELEVANCE_SCORE = 0.35;

export type SearchDocumentParts = {
  title: string;
  meta: string;
  description: string;
};

/** Accent-normalized weighted document parts for to_tsvector. */
export function buildWeightedSearchParts(product: {
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  tags?: string[];
}): SearchDocumentParts {
  const meta = [product.brand, product.category, ...(product.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  return {
    title: normalizeText(product.title),
    meta: normalizeText(meta),
    description: normalizeText(product.description ?? ""),
  };
}

/**
 * Tokens used for FTS retrieval.
 * Prefer interest words (vin, kaffe…) so recipient filler ("mor", "elsker")
 * does not pull unrelated catalog rows. Falls back to all search tokens.
 */
export function preferenceSearchTokens(preferences: GiftPreferences): string[] {
  const intent = analyzeGiftIntent(preferences);
  const primary =
    intent.interestTokens.length > 0
      ? intent.interestTokens
      : intent.allTokens;

  return [...primary].sort((a, b) => b.length - a.length).slice(0, 12);
}

function sanitizeTsTerm(token: string): string | null {
  // Keep Danish letters — simple FTS config indexes them as-is
  const term = token.replace(/[^a-z0-9æøå]/gi, "");
  if (term.length < 2) return null;
  return term;
}

/**
 * Build a safe `simple` to_tsquery string.
 * Short tokens (≤3) stay exact so `vin` does not match `vinter`.
 * Longer tokens get prefix match for compound titles.
 */
export function buildTsQueryString(tokens: string[]): string | null {
  const terms = tokens
    .map(sanitizeTsTerm)
    .filter((t): t is string => Boolean(t));

  if (terms.length === 0) return null;

  const unique = [...new Set(terms)];
  return unique
    .map((t) => (t.length <= 3 ? t : `${t}:*`))
    .join(" | ");
}

/** Prisma WHERE for sample exclusion + soft budget (no text filter). */
export function buildBudgetWhere(
  preferences: GiftPreferences,
  opts: { excludeSamples: boolean },
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (opts.excludeSamples) {
    and.push({ isSample: false });
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

/** SQL fragments for soft budget filters on alias `p`. */
export function budgetSqlFragments(
  preferences: GiftPreferences,
): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [];

  if (preferences.budgetMinOre !== undefined) {
    const min = Math.floor(preferences.budgetMinOre * BUDGET_SOFT_MIN);
    parts.push(
      Prisma.sql`(p."priceOre" IS NULL OR p."priceOre" >= ${min})`,
    );
  }

  if (preferences.budgetMaxOre !== undefined) {
    const max = Math.ceil(preferences.budgetMaxOre * BUDGET_SOFT_MAX);
    parts.push(
      Prisma.sql`(p."priceOre" IS NULL OR p."priceOre" <= ${max})`,
    );
  }

  return parts;
}

/**
 * FTS candidate IDs ordered by ts_rank_cd (highest first).
 */
export async function findProductIdsByFts(opts: {
  tsQuery: string;
  excludeSamples: boolean;
  preferences: GiftPreferences;
  limit?: number;
}): Promise<string[]> {
  const limit = opts.limit ?? CANDIDATE_LIMIT;
  const filters: Prisma.Sql[] = [
    Prisma.sql`p."searchVector" @@ to_tsquery('simple', ${opts.tsQuery})`,
  ];

  if (opts.excludeSamples) {
    filters.push(Prisma.sql`p."isSample" = false`);
  }

  filters.push(...budgetSqlFragments(opts.preferences));

  const whereSql = Prisma.join(filters, " AND ");

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM "Product" p
    WHERE ${whereSql}
    ORDER BY ts_rank_cd(p."searchVector", to_tsquery('simple', ${opts.tsQuery})) DESC,
      p."updatedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => r.id);
}

/** Persist weighted searchVector after a product upsert. */
export async function refreshProductSearchVector(product: {
  provider: string;
  externalId: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  tags?: string[];
}): Promise<void> {
  const parts = buildWeightedSearchParts(product);
  await prisma.$executeRaw`
    UPDATE "Product"
    SET "searchVector" =
      setweight(to_tsvector('simple', ${parts.title}), 'A')
      || setweight(to_tsvector('simple', ${parts.meta}), 'B')
      || setweight(to_tsvector('simple', ${parts.description}), 'C')
    WHERE "provider" = ${product.provider}
      AND "externalId" = ${product.externalId}
  `;
}

export async function refreshProductSearchVectors(
  products: Array<{
    provider: string;
    externalId: string;
    title: string;
    description?: string | null;
    brand?: string | null;
    category?: string | null;
    tags?: string[];
  }>,
): Promise<void> {
  for (const product of products) {
    await refreshProductSearchVector(product);
  }
}
