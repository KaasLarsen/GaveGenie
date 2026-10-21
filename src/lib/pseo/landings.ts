import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  PARTNER_ADS_FEEDS,
  PARTNER_ADS_PRIORITY_FEED_IDS,
} from "../feeds/partner-ads-registry";
import { SEO_MIN_PRODUCTS } from "./constants";
import type { ResolvedSlug } from "./slug";
import { resolveSlug } from "./slug";
import type { LandingFilters, PathPattern } from "./taxonomy";
import {
  BUDGETS,
  INTERESTS,
  OCCASIONS,
  RECIPIENTS,
  budgetSeoTag,
  enumerateLandingSpecs,
  interestSeoTag,
  occasionSeoTag,
  recipientSeoTag,
} from "./taxonomy";

/** Curated guide grid size (multi-shop shortlist). */
export const LANDING_PRODUCT_LIMIT = 12;
/** Soft cap per shop on guide pages (~3 forslag pr. butik). */
export const LANDING_MAX_PER_RETAILER = 3;

const PRIORITY_RETAILER_NAMES = new Set(
  PARTNER_ADS_PRIORITY_FEED_IDS.map((id) => {
    const feed = PARTNER_ADS_FEEDS.find((f) => f.feedId === id);
    return (feed?.label ?? "").toLowerCase();
  }).filter(Boolean),
);

const MASS_CATALOG_RETAILER_NAMES = new Set([
  "booktok",
  "booktok.dk",
  "med24",
  "med24.dk",
]);

export type SeoProductRow = {
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

function retailerKey(name: string): string {
  return name.trim().toLowerCase();
}

function isPriorityRetailer(name: string): boolean {
  const key = retailerKey(name);
  if (PRIORITY_RETAILER_NAMES.has(key)) return true;
  for (const priority of PRIORITY_RETAILER_NAMES) {
    if (key.includes(priority) || priority.includes(key)) return true;
  }
  return false;
}

function isMassCatalogRetailer(name: string): boolean {
  const key = retailerKey(name);
  if (MASS_CATALOG_RETAILER_NAMES.has(key)) return true;
  return key.includes("booktok") || key.includes("med24");
}

/**
 * Rank a candidate pool for guide pages: priority gift shops first,
 * mega-catalogs (Booktok/Med24) last unless the hub is book-focused.
 */
export function rankLandingCandidates<T extends {
  retailerName: string;
  inStock: boolean | null;
  priceOre: number | null;
  title: string;
}>(
  candidates: T[],
  options?: { allowMassCatalog?: boolean },
): T[] {
  const allowMass = Boolean(options?.allowMassCatalog);
  return [...candidates].sort((a, b) => {
    const aPriority = isPriorityRetailer(a.retailerName) ? 1 : 0;
    const bPriority = isPriorityRetailer(b.retailerName) ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;

    if (!allowMass) {
      const aMass = isMassCatalogRetailer(a.retailerName) ? 1 : 0;
      const bMass = isMassCatalogRetailer(b.retailerName) ? 1 : 0;
      if (aMass !== bMass) return aMass - bMass;
    }

    const aStock = a.inStock === true ? 1 : 0;
    const bStock = b.inStock === true ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;

    const aPrice = a.priceOre ?? -1;
    const bPrice = b.priceOre ?? -1;
    if (aPrice !== bPrice) return bPrice - aPrice;

    return a.title.localeCompare(b.title, "da");
  });
}

/**
 * Hard per-shop cap for guides (no overflow fill). Better a short multi-shop
 * list than 12 identical Rollerblade SKUs from one catalog.
 */
export function diversifyLandingStrict<T extends { retailerName: string }>(
  ranked: T[],
  limit = LANDING_PRODUCT_LIMIT,
  maxPerRetailer = LANDING_MAX_PER_RETAILER,
): T[] {
  const counts = new Map<string, number>();
  const selected: T[] = [];
  for (const item of ranked) {
    const key = item.retailerName || "unknown";
    const n = counts.get(key) ?? 0;
    if (n >= maxPerRetailer) continue;
    selected.push(item);
    counts.set(key, n + 1);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function selectLandingProducts<T extends {
  retailerName: string;
  inStock: boolean | null;
  priceOre: number | null;
  title: string;
}>(
  candidates: T[],
  limit = LANDING_PRODUCT_LIMIT,
  options?: { allowMassCatalog?: boolean },
): T[] {
  const ranked = rankLandingCandidates(candidates, options);
  return diversifyLandingStrict(ranked, limit, LANDING_MAX_PER_RETAILER);
}

export function uniqueRetailerCount(
  products: Array<{ retailerName: string }>,
): number {
  return new Set(
    products.map((p) => retailerKey(p.retailerName)).filter(Boolean),
  ).size;
}

function requiredTagsForFilters(filters: LandingFilters): string[] {
  const tags: string[] = [];
  if (filters.recipientId) tags.push(recipientSeoTag(filters.recipientId));
  if (filters.interestId) tags.push(interestSeoTag(filters.interestId));
  if (filters.occasionId) tags.push(occasionSeoTag(filters.occasionId));
  if (filters.budgetId) tags.push(budgetSeoTag(filters.budgetId));
  return tags;
}

export function productWhereForFilters(
  filters: LandingFilters,
): Prisma.ProductWhereInput {
  const tags = requiredTagsForFilters(filters);
  const where: Prisma.ProductWhereInput = {};
  if (tags.length > 0) {
    where.tags = { hasEvery: tags };
  }
  if (filters.budgetMaxOre != null) {
    where.priceOre = { lte: filters.budgetMaxOre };
  }
  // Adult recipient hubs: no children's products, and no pure book-catalog
  // filler (Booktok etc. tagged only as læseren).
  if (filters.recipientId === "ham" || filters.recipientId === "hende") {
    const notClauses: Prisma.ProductWhereInput[] = [
      { tags: { has: recipientSeoTag("barn") } },
    ];
    if (!filters.interestId) {
      notClauses.push({ tags: { has: interestSeoTag("laeseren") } });
    }
    where.NOT = notClauses.length === 1 ? notClauses[0] : { OR: notClauses };
  }
  return where;
}

export async function countProductsForFilters(
  filters: LandingFilters,
): Promise<number> {
  return prisma.product.count({ where: productWhereForFilters(filters) });
}

export async function fetchLandingProducts(
  filters: LandingFilters,
  limit = LANDING_PRODUCT_LIMIT,
): Promise<SeoProductRow[]> {
  const poolSize = Math.min(Math.max(limit * 6, 48), 120);
  const allowMassCatalog = filters.interestId === "laeseren";

  const rows = await prisma.product.findMany({
    where: {
      ...productWhereForFilters(filters),
      isSample: false,
    },
    orderBy: [{ inStock: "desc" }, { priceOre: "desc" }, { title: "asc" }],
    take: poolSize,
    include: { retailer: { select: { name: true } } },
  });

  const mapped: SeoProductRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    brand: r.brand,
    category: r.category,
    tags: r.tags,
    priceOre: r.priceOre,
    currency: r.currency,
    imageUrl: r.imageUrl,
    productUrl: r.productUrl,
    inStock: r.inStock,
    isSample: r.isSample,
    retailerName: r.retailer.name,
  }));

  return selectLandingProducts(mapped, limit, { allowMassCatalog });
}

export async function aggregateLandingStats(filters: LandingFilters): Promise<{
  productCount: number;
  minPriceOre: number | null;
  maxPriceOre: number | null;
  topCategories: string[];
}> {
  const where = productWhereForFilters(filters);
  const [productCount, priceAgg, categoryRows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.aggregate({
      where: { ...where, priceOre: { not: null } },
      _min: { priceOre: true },
      _max: { priceOre: true },
    }),
    prisma.product.findMany({
      where: { ...where, category: { not: null } },
      select: { category: true },
      take: 200,
    }),
  ]);

  const catCounts = new Map<string, number>();
  for (const row of categoryRows) {
    if (!row.category) continue;
    catCounts.set(row.category, (catCounts.get(row.category) ?? 0) + 1);
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    productCount,
    minPriceOre: priceAgg._min.priceOre,
    maxPriceOre: priceAgg._max.priceOre,
    topCategories,
  };
}

export type SyncLandingsResult = {
  upserted: number;
  indexed: number;
};

/** Recompute all taxonomy landings and upsert SeoLanding rows. */
export async function syncSeoLandings(): Promise<SyncLandingsResult> {
  const specs = enumerateLandingSpecs();
  let upserted = 0;
  let indexed = 0;

  for (const spec of specs) {
    const stats = await aggregateLandingStats(spec.filters);
    const isIndexed = stats.productCount >= SEO_MIN_PRODUCTS;
    if (isIndexed) indexed += 1;

    await prisma.seoLanding.upsert({
      where: { slug: spec.slug },
      create: {
        slug: spec.slug,
        pathPattern: spec.pathPattern,
        filters: spec.filters as Prisma.InputJsonValue,
        productCount: stats.productCount,
        minPriceOre: stats.minPriceOre,
        maxPriceOre: stats.maxPriceOre,
        indexed: isIndexed,
      },
      update: {
        pathPattern: spec.pathPattern,
        filters: spec.filters as Prisma.InputJsonValue,
        productCount: stats.productCount,
        minPriceOre: stats.minPriceOre,
        maxPriceOre: stats.maxPriceOre,
        indexed: isIndexed,
      },
    });
    upserted += 1;
  }

  return { upserted, indexed };
}

export async function getIndexedLanding(slug: string) {
  return prisma.seoLanding.findUnique({ where: { slug } });
}

export async function listIndexedLandings() {
  return prisma.seoLanding.findMany({
    where: { indexed: true },
    orderBy: { slug: "asc" },
  });
}

/** Related landings for internal linking (same family, other dimension). */
export async function findRelatedLandings(
  resolved: ResolvedSlug,
  limit = 6,
): Promise<Array<{ slug: string; label: string; href: string }>> {
  const related: Array<{ slug: string; label: string; href: string }> = [];

  if (
    resolved.pathPattern === "recipient" ||
    resolved.pathPattern === "recipient-interest"
  ) {
    const recipientId = resolved.filters.recipientId!;
    const recipient = RECIPIENTS.find((r) => r.id === recipientId)!;
    for (const interest of INTERESTS) {
      if (interest.id === resolved.filters.interestId) continue;
      const slug = `${recipient.slug}/${interest.slug}`;
      related.push({
        slug,
        label: `Gaver ${recipient.phrase} · ${interest.label}`,
        href: `/gaver/${slug}`,
      });
    }
  } else if (
    resolved.pathPattern === "occasion" ||
    resolved.pathPattern === "occasion-budget"
  ) {
    const occasionId = resolved.filters.occasionId!;
    const occasion = OCCASIONS.find((o) => o.id === occasionId)!;
    for (const budget of BUDGETS) {
      if (budget.id === resolved.filters.budgetId) continue;
      const slug = `${occasion.slug}/${budget.slug}`;
      related.push({
        slug,
        label: `${occasion.label} · ${budget.label}`,
        href: `/gaver/${slug}`,
      });
    }
  }

  if (related.length === 0) return [];

  const indexed = await prisma.seoLanding.findMany({
    where: {
      indexed: true,
      slug: { in: related.map((r) => r.slug) },
    },
    select: { slug: true },
  });
  const indexedSet = new Set(indexed.map((r) => r.slug));
  return related.filter((r) => indexedSet.has(r.slug)).slice(0, limit);
}

export function parseLandingFilters(
  filters: unknown,
): LandingFilters | null {
  if (!filters || typeof filters !== "object") return null;
  return filters as LandingFilters;
}

export function resolveSlugFromPath(slugPath: string): ResolvedSlug | null {
  const segments = slugPath.split("/").filter(Boolean);
  return resolveSlug(segments);
}

export type { PathPattern };
