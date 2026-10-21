import { prisma } from "../db";
import type { NormalizedProduct } from "../types";
import { SEO_TAG_PREFIX } from "./constants";
import { enrichProductSeoTags } from "./enrich-tags";
import { syncSeoLandings, type SyncLandingsResult } from "./landings";

export type RetagResult = {
  scanned: number;
  updated: number;
  skipped: number;
  seo: SyncLandingsResult | null;
};

/**
 * Re-apply taxonomy SEO tags to catalog rows.
 * Default: only rows still missing `seo:*` tags.
 * `force: true` rewrites every product (needed after matcher tightening).
 */
export async function retagProductsMissingSeoTags(options?: {
  batchSize?: number;
  maxProducts?: number;
  force?: boolean;
}): Promise<RetagResult> {
  const batchSize = options?.batchSize ?? 100;
  const maxProducts = options?.maxProducts ?? 2_000;
  const force = Boolean(options?.force);

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let cursor: string | undefined;

  while (scanned < maxProducts) {
    const rows = await prisma.product.findMany({
      take: Math.min(batchSize, maxProducts - scanned),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        provider: true,
        externalId: true,
        title: true,
        description: true,
        brand: true,
        category: true,
        tags: true,
        priceOre: true,
        currency: true,
        imageUrl: true,
        productUrl: true,
        inStock: true,
        isSample: true,
        retailer: { select: { slug: true, name: true, website: true } },
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]!.id;
    scanned += rows.length;

    for (const row of rows) {
      if (!force && row.tags.some((t) => t.startsWith(SEO_TAG_PREFIX))) {
        skipped += 1;
        continue;
      }

      const normalized: NormalizedProduct = {
        provider: row.provider,
        externalId: row.externalId,
        retailerSlug: row.retailer.slug,
        retailerName: row.retailer.name,
        retailerWebsite: row.retailer.website ?? undefined,
        title: row.title,
        description: row.description ?? undefined,
        brand: row.brand ?? undefined,
        category: row.category ?? undefined,
        tags: row.tags,
        priceOre: row.priceOre,
        currency: row.currency,
        imageUrl: row.imageUrl ?? undefined,
        productUrl: row.productUrl,
        inStock: row.inStock,
        isSample: row.isSample,
      };

      const enriched = enrichProductSeoTags(normalized);
      if (enriched.tags.join("\0") === row.tags.join("\0")) {
        skipped += 1;
        continue;
      }

      await prisma.product.update({
        where: { id: row.id },
        data: { tags: enriched.tags },
      });
      updated += 1;
    }
  }

  let seo: SyncLandingsResult | null = null;
  if (updated > 0) {
    seo = await syncSeoLandings();
  }

  return { scanned, updated, skipped, seo };
}
