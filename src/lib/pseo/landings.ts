import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  PARTNER_ADS_FEEDS,
  PARTNER_ADS_PRIORITY_FEED_IDS,
} from "../feeds/partner-ads-registry";
import { normalizeText } from "../normalize";
import { isMassCatalogRetailer } from "../retailers";
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

const STRONG_MALE_PHRASES = [
  "til ham",
  "gave til ham",
  "herre",
  "herretoj",
  "herrebekladning",
  "gentleman",
  "menswear",
];
const STRONG_FEMALE_PHRASES = [
  "til hende",
  "gave til hende",
  "dame",
  "dametoj",
  "damebekladning",
  "womenswear",
  "ladieswear",
];
const WEAK_HUB_FILLER = [
  "braetspil",
  "brætspil",
  "boardgame",
  "sojalys",
  "duftlys",
  "diffuser",
];
const GIFT_SIGNAL = [
  "gave",
  "gaveide",
  "gaveæske",
  "gaveaeske",
  "julegave",
  "set",
  "kit",
  "pakke",
];

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
  /** Deterministic Danish rationale for guide cards */
  why?: string;
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

function blobFor(product: {
  title: string;
  category?: string | null;
  brand?: string | null;
  tags?: string[];
}): string {
  return normalizeText(
    [product.title, product.category ?? "", product.brand ?? "", ...(product.tags ?? [])].join(
      " ",
    ),
  );
}

function includesAny(blob: string, needles: string[]): boolean {
  return needles.some((n) => {
    const needle = normalizeText(n);
    if (!needle) return false;
    return (
      blob === needle ||
      blob.startsWith(`${needle} `) ||
      blob.endsWith(` ${needle}`) ||
      blob.includes(` ${needle} `) ||
      (needle.includes(" ") && blob.includes(needle))
    );
  });
}

export type GiftabilityOptions = {
  allowMassCatalog?: boolean;
  filters?: LandingFilters;
};

/**
 * Score how strong a gift pick is for a landing (higher = better).
 * Prefers gift shops, mid-range prices, clear gift/gender/occasion signals.
 */
export function giftabilityScore(
  product: {
    retailerName: string;
    inStock: boolean | null;
    priceOre: number | null;
    title: string;
    category?: string | null;
    brand?: string | null;
    tags?: string[];
  },
  options?: GiftabilityOptions,
): number {
  const allowMass = Boolean(options?.allowMassCatalog);
  const filters = options?.filters;
  const bareRecipientHub =
    Boolean(filters?.recipientId) &&
    !filters?.interestId &&
    (filters?.recipientId === "ham" || filters?.recipientId === "hende");
  const blob = blobFor(product);
  let score = 0;

  if (isPriorityRetailer(product.retailerName)) score += 40;
  if (!allowMass && isMassCatalogRetailer(product.retailerName)) score -= 55;

  if (product.inStock === true) score += 18;
  else if (product.inStock === null) score += 6;

  const price = product.priceOre;
  if (price != null) {
    if (price >= 150_00 && price <= 600_00) score += 22;
    else if (price >= 80_00 && price < 150_00) score += 12;
    else if (price > 600_00 && price <= 1200_00) score += 8;
    else if (price > 1200_00) score -= 5;
    else if (price < 50_00) score -= 8;
  }

  if (includesAny(blob, GIFT_SIGNAL)) score += 12;

  if (filters?.recipientId === "ham") {
    if (includesAny(blob, STRONG_MALE_PHRASES)) score += 28;
    if (bareRecipientHub && includesAny(blob, WEAK_HUB_FILLER)) score -= 35;
  }
  if (filters?.recipientId === "hende") {
    if (includesAny(blob, STRONG_FEMALE_PHRASES)) score += 28;
    if (bareRecipientHub && includesAny(blob, WEAK_HUB_FILLER)) score -= 35;
  }

  if (filters?.occasionId === "jul") {
    if (includesAny(blob, ["jul", "jule", "christmas", "advent", "julegave"])) {
      score += 30;
    }
    // Plain gift boxes without Christmas signal are weak jul picks.
    if (
      includesAny(blob, ["gaveæske", "gaveaeske"]) &&
      !includesAny(blob, ["jul", "jule", "christmas", "advent"])
    ) {
      score -= 25;
    }
  } else if (filters?.occasionId) {
    const occasion = OCCASIONS.find((o) => o.id === filters.occasionId);
    if (occasion && includesAny(blob, occasion.match.keywords)) score += 20;
  }

  if (filters?.interestId) {
    const interest = INTERESTS.find((i) => i.id === filters.interestId);
    if (interest && includesAny(blob, interest.match.keywords)) score += 18;
  }

  if (product.tags?.includes(recipientSeoTag("barn")) && bareRecipientHub) {
    score -= 40;
  }

  return score;
}

/**
 * Rank a candidate pool for guide pages by giftability (not raw price).
 */
export function rankLandingCandidates<
  T extends {
    retailerName: string;
    inStock: boolean | null;
    priceOre: number | null;
    title: string;
    category?: string | null;
    brand?: string | null;
    tags?: string[];
  },
>(candidates: T[], options?: GiftabilityOptions): T[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff =
      giftabilityScore(b, options) - giftabilityScore(a, options);
    if (scoreDiff !== 0) return scoreDiff;
    return a.title.localeCompare(b.title, "da");
  });
}

/**
 * Prefer multi-shop shortlists (max N per retailer). If several shops are
 * present but the list is still short, soft-overflow ignoring the cap.
 * Single-shop pools stay hard-capped (better short than 12 identical SKUs).
 */
export function diversifyLandingStrict<T extends { retailerName: string }>(
  ranked: T[],
  limit = LANDING_PRODUCT_LIMIT,
  maxPerRetailer = LANDING_MAX_PER_RETAILER,
): T[] {
  const counts = new Map<string, number>();
  const selected: T[] = [];
  const selectedIds = new Set<T>();
  const poolRetailers = new Set(
    ranked.map((item) => item.retailerName || "unknown"),
  );

  for (const item of ranked) {
    const key = item.retailerName || "unknown";
    const n = counts.get(key) ?? 0;
    if (n >= maxPerRetailer) continue;
    selected.push(item);
    selectedIds.add(item);
    counts.set(key, n + 1);
    if (selected.length >= limit) return selected;
  }

  if (selected.length < limit && poolRetailers.size >= 2) {
    for (const item of ranked) {
      if (selectedIds.has(item)) continue;
      selected.push(item);
      selectedIds.add(item);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

export function selectLandingProducts<
  T extends {
    retailerName: string;
    inStock: boolean | null;
    priceOre: number | null;
    title: string;
    category?: string | null;
    brand?: string | null;
    tags?: string[];
  },
>(
  candidates: T[],
  limit = LANDING_PRODUCT_LIMIT,
  options?: GiftabilityOptions,
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

  return selectLandingProducts(mapped, limit, { allowMassCatalog, filters });
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
