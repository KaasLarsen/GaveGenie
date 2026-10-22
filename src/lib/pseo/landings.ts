import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  PARTNER_ADS_FEEDS,
  PARTNER_ADS_PRIORITY_FEED_IDS,
} from "../feeds/partner-ads-registry";
import { normalizeText } from "../normalize";
import {
  isChildrenCatalogRetailer,
  isMassCatalogRetailer,
  looksLikeChildProduct,
} from "../retailers";
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
  "gaver til ham",
  "herre",
  "herretoj",
  "herrebekladning",
  "gentleman",
  "menswear",
];
const STRONG_FEMALE_PHRASES = [
  "til hende",
  "gave til hende",
  "gaver til hende",
  "dame",
  "dametoj",
  "damebekladning",
  "womenswear",
  "ladieswear",
];
/** Soft gendered interests that may appear on bare ham/hende hubs. */
const SOFT_MALE_INTEREST = [
  "gaming",
  "gamer",
  "playstation",
  "xbox",
  "nintendo",
  "controller",
  "headset",
  "computergame",
  "pc-spil",
  "pc spil",
];
const SOFT_FEMALE_INTEREST = [
  "parfume",
  "makeup",
  "hudpleje",
  "skønhed",
  "skoenhed",
  "beauty",
  "spa",
  "creme",
];
const FEED_GENDER_MALE = ["male", "men", "man", "herre", "herrer", "mande"];
const FEED_GENDER_FEMALE = [
  "female",
  "women",
  "woman",
  "dame",
  "damer",
  "kvinde",
];
/** Never show these on bare recipient hubs — wrong for “gaver til X”. */
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
/** Adult occasions where kids shops / barn products are off-purpose. */
const ADULT_OCCASIONS = new Set([
  "mors-dag",
  "fars-dag",
  "bryllup",
  "hostegave",
]);
const ADULT_RECIPIENTS = new Set(["ham", "hende", "par", "kollega"]);

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

type ScoreableProduct = {
  retailerName: string;
  inStock: boolean | null;
  priceOre: number | null;
  title: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  tags?: string[];
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
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  tags?: string[];
}): string {
  // Exclude seo:* tags — otherwise “seo:anledning:jul” self-matches purpose checks.
  const feedTags = (product.tags ?? []).filter((t) => !t.startsWith("seo:"));
  return normalizeText(
    [
      product.title,
      product.description ?? "",
      product.category ?? "",
      product.brand ?? "",
      ...feedTags,
    ].join(" "),
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

function hasFeedGender(
  tags: string[] | undefined,
  gender: "male" | "female",
): boolean {
  if (!tags?.length) return false;
  const set = gender === "male" ? FEED_GENDER_MALE : FEED_GENDER_FEMALE;
  return tags.some((t) => set.includes(normalizeText(t)));
}

/**
 * Priority shops only boost when they fit the landing purpose
 * (wine ≠ “gaver til ham”, perfume ≠ fitness, etc.).
 */
function contextualPriorityBoost(
  retailerName: string,
  filters?: LandingFilters,
): number {
  if (!isPriorityRetailer(retailerName)) return 0;
  const key = retailerKey(retailerName);
  const interest = filters?.interestId;
  const occasion = filters?.occasionId;
  const recipient = filters?.recipientId;

  const isWine = key.includes("wine") || key.includes("dh wines") || key === "sps wine";
  const isPerfume = key.includes("parfum") || key.includes("eaudeparfum");
  const isPoster = key.includes("plakat") || key.includes("designplakat");

  if (isWine) {
    if (interest === "madentusiasten") return 40;
    if (
      occasion === "jul" ||
      occasion === "hostegave" ||
      occasion === "bryllup" ||
      occasion === "fodselsdag"
    ) {
      return 28;
    }
    if (recipient === "par" || recipient === "kollega") return 12;
    return 0;
  }

  if (isPerfume) {
    if (interest === "skoenhed") return 40;
    if (recipient === "hende") return 22;
    if (occasion === "mors-dag" || occasion === "fodselsdag") return 20;
    return 0;
  }

  if (isPoster) {
    if (interest === "bolig") return 40;
    if (recipient === "hende" || recipient === "ham" || recipient === "par") {
      return 10;
    }
    return 0;
  }

  return 12;
}

export type GiftabilityOptions = {
  allowMassCatalog?: boolean;
  filters?: LandingFilters;
};

/**
 * Hard gate: product text must match the guide’s purpose.
 * SEO tags alone are not enough — stale/soft tags caused wrong picks.
 */
export function matchesLandingPurpose(
  product: ScoreableProduct,
  options?: GiftabilityOptions,
): boolean {
  const allowMass = Boolean(options?.allowMassCatalog);
  const filters = options?.filters;
  if (!filters) return true;

  const blob = blobFor(product);
  const recipientId = filters.recipientId;
  const interestId = filters.interestId;
  const occasionId = filters.occasionId;
  const bareRecipientHub =
    Boolean(recipientId) && !interestId && !occasionId;
  const adultRecipient =
    recipientId != null && ADULT_RECIPIENTS.has(recipientId);

  if (!allowMass && isMassCatalogRetailer(product.retailerName)) {
    return false;
  }

  if (
    (adultRecipient || (occasionId != null && ADULT_OCCASIONS.has(occasionId))) &&
    (looksLikeChildProduct({
      title: product.title,
      category: product.category,
      tags: product.tags,
      retailerName: product.retailerName,
    }) ||
      isChildrenCatalogRetailer(product.retailerName) ||
      product.tags?.includes(recipientSeoTag("barn")))
  ) {
    return false;
  }

  if (interestId) {
    const interest = INTERESTS.find((i) => i.id === interestId);
    if (interest) {
      const negatives = interest.match.negativeKeywords;
      if (negatives?.length && includesAny(blob, negatives)) return false;
      if (!includesAny(blob, interest.match.keywords)) return false;
    }
  }

  if (occasionId) {
    const occasion = OCCASIONS.find((o) => o.id === occasionId);
    if (occasion) {
      const negatives = occasion.match.negativeKeywords;
      if (negatives?.length && includesAny(blob, negatives)) return false;
      if (!includesAny(blob, occasion.match.keywords)) return false;
      // Bare gift boxes without Christmas words are not jul-purpose.
      if (
        occasionId === "jul" &&
        includesAny(blob, ["gaveæske", "gaveaeske"]) &&
        !includesAny(blob, ["jul", "jule", "christmas", "advent", "julegave"])
      ) {
        return false;
      }
    }
  }

  if (recipientId === "ham") {
    // Brætspil/duftlys etc. are never “gaver til ham” hub material.
    if (bareRecipientHub && includesAny(blob, WEAK_HUB_FILLER)) return false;
    const strong = includesAny(blob, STRONG_MALE_PHRASES);
    const soft = includesAny(blob, SOFT_MALE_INTEREST);
    const feed = hasFeedGender(product.tags, "male");
    // Always require a real ham signal — seo:modtager:ham alone is not enough.
    if (!strong && !soft && !feed) return false;
  }

  if (recipientId === "hende") {
    if (bareRecipientHub && includesAny(blob, WEAK_HUB_FILLER)) return false;
    const strong = includesAny(blob, STRONG_FEMALE_PHRASES);
    const soft = includesAny(blob, SOFT_FEMALE_INTEREST);
    const feed = hasFeedGender(product.tags, "female");
    if (!strong && !soft && !feed) return false;
  }

  if (
    bareRecipientHub &&
    recipientId &&
    recipientId !== "ham" &&
    recipientId !== "hende" &&
    recipientId !== "barn"
  ) {
    const recipient = RECIPIENTS.find((r) => r.id === recipientId);
    if (
      recipient &&
      !includesAny(blob, recipient.match.keywords) &&
      !includesAny(blob, GIFT_SIGNAL)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Score how strong a gift pick is for a landing (higher = better).
 * Prefers purpose fit, mid-range prices, clear gift/gender/occasion signals.
 */
export function giftabilityScore(
  product: ScoreableProduct,
  options?: GiftabilityOptions,
): number {
  const filters = options?.filters;
  const blob = blobFor(product);
  let score = 0;

  score += contextualPriorityBoost(product.retailerName, filters);

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
    if (includesAny(blob, STRONG_MALE_PHRASES)) score += 32;
    else if (includesAny(blob, SOFT_MALE_INTEREST)) score += 18;
    else if (hasFeedGender(product.tags, "male")) score += 10;
  }
  if (filters?.recipientId === "hende") {
    if (includesAny(blob, STRONG_FEMALE_PHRASES)) score += 32;
    else if (includesAny(blob, SOFT_FEMALE_INTEREST)) score += 18;
    else if (hasFeedGender(product.tags, "female")) score += 10;
  }

  if (filters?.occasionId) {
    const occasion = OCCASIONS.find((o) => o.id === filters.occasionId);
    if (occasion && includesAny(blob, occasion.match.keywords)) score += 30;
  }

  if (filters?.interestId) {
    const interest = INTERESTS.find((i) => i.id === filters.interestId);
    if (interest && includesAny(blob, interest.match.keywords)) score += 30;
  }

  return score;
}

/**
 * Rank a candidate pool for guide pages by giftability (not raw price).
 */
export function rankLandingCandidates<T extends ScoreableProduct>(
  candidates: T[],
  options?: GiftabilityOptions,
): T[] {
  return [...candidates].sort((a, b) => {
    const scoreDiff =
      giftabilityScore(b, options) - giftabilityScore(a, options);
    if (scoreDiff !== 0) return scoreDiff;
    return a.title.localeCompare(b.title, "da");
  });
}

/**
 * Prefer multi-shop shortlists (max N per retailer).
 * Never soft-overflow past the cap — fewer good picks beat one-shop filler.
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
    if (selected.length >= limit) return selected;
  }

  return selected;
}

export function selectLandingProducts<T extends ScoreableProduct>(
  candidates: T[],
  limit = LANDING_PRODUCT_LIMIT,
  options?: GiftabilityOptions,
): T[] {
  const purposeful = candidates.filter((c) =>
    matchesLandingPurpose(c, options),
  );
  const ranked = rankLandingCandidates(purposeful, options);
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
  // Adult recipient / occasion hubs: no children's products, and no pure
  // book-catalog filler on bare recipient hubs.
  const adultRecipient =
    filters.recipientId != null && ADULT_RECIPIENTS.has(filters.recipientId);
  const adultOccasion =
    filters.occasionId != null && ADULT_OCCASIONS.has(filters.occasionId);
  if (adultRecipient || adultOccasion) {
    const notClauses: Prisma.ProductWhereInput[] = [
      { tags: { has: recipientSeoTag("barn") } },
    ];
    if (
      adultRecipient &&
      !filters.interestId &&
      (filters.recipientId === "ham" || filters.recipientId === "hende")
    ) {
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
  // Larger pool, no price-desc bias — giftability + purpose-fit decide.
  const poolSize = Math.min(Math.max(limit * 12, 72), 200);
  const allowMassCatalog = filters.interestId === "laeseren";

  const rows = await prisma.product.findMany({
    where: {
      ...productWhereForFilters(filters),
      isSample: false,
    },
    orderBy: [{ inStock: "desc" }, { updatedAt: "desc" }, { title: "asc" }],
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
