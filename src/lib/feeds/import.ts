import { prisma } from "../db";
import { enrichProductsSeoTags } from "../pseo/enrich-tags";
import { refreshProductSearchVectors } from "../search";
import type { NormalizedProduct } from "../types";
import type { FeedAdapter } from "./types";

export type ImportResult = {
  provider: string;
  source: string;
  productCount: number;
  deletedCount: number;
  importId: string;
  isDevelopmentData: boolean;
};

const BATCH_SIZE = 75;

async function upsertProductBatch(products: NormalizedProduct[]): Promise<void> {
  const retailers = new Map<
    string,
    { slug: string; name: string; website?: string }
  >();
  for (const product of products) {
    retailers.set(product.retailerSlug, {
      slug: product.retailerSlug,
      name: product.retailerName,
      website: product.retailerWebsite,
    });
  }

  const retailerIdBySlug = new Map<string, string>();

  for (const retailer of retailers.values()) {
    const row = await prisma.retailer.upsert({
      where: { slug: retailer.slug },
      create: {
        slug: retailer.slug,
        name: retailer.name,
        website: retailer.website,
      },
      update: {
        name: retailer.name,
        website: retailer.website,
      },
    });
    retailerIdBySlug.set(retailer.slug, row.id);
  }

  await prisma.$transaction(
    products.map((product) => {
      const retailerId = retailerIdBySlug.get(product.retailerSlug);
      if (!retailerId) {
        throw new Error(`Missing retailer id for ${product.retailerSlug}`);
      }
      return prisma.product.upsert({
        where: {
          provider_externalId: {
            provider: product.provider,
            externalId: product.externalId,
          },
        },
        create: {
          provider: product.provider,
          externalId: product.externalId,
          retailerId,
          title: product.title,
          description: product.description,
          brand: product.brand,
          category: product.category,
          tags: product.tags,
          priceOre: product.priceOre,
          currency: product.currency,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          inStock: product.inStock,
          isSample: product.isSample,
        },
        update: {
          retailerId,
          title: product.title,
          description: product.description,
          brand: product.brand,
          category: product.category,
          tags: product.tags,
          priceOre: product.priceOre,
          currency: product.currency,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          inStock: product.inStock,
          isSample: product.isSample,
        },
      });
    }),
  );

  // Weighted tsvector (accent-normalized) — Prisma cannot write Unsupported("tsvector")
  await refreshProductSearchVectors(products);
}

/**
 * Upsert products by (provider, externalId) in batches.
 * After a successful import, deletes stale rows for that provider
 * that were not touched in this run (updatedAt < import start).
 */
export async function importFeed(adapter: FeedAdapter): Promise<ImportResult> {
  const loaded = await adapter.load();
  const importStartedAt = new Date();

  const feedImport = await prisma.feedImport.create({
    data: {
      provider: loaded.provider,
      source: loaded.source,
      status: "running",
      productCount: 0,
      message: loaded.isDevelopmentData
        ? "DEV sample feed — not live affiliate data"
        : null,
    },
  });

  try {
    let count = 0;
    const products = enrichProductsSeoTags(loaded.products);

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      await upsertProductBatch(batch);
      count += batch.length;
    }

    // Upserts refresh updatedAt; anything still older than this run is gone from the feed
    const deleted = await prisma.product.deleteMany({
      where: {
        provider: loaded.provider,
        updatedAt: { lt: importStartedAt },
      },
    });

    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: "ok",
        productCount: count,
        finishedAt: new Date(),
        message: loaded.isDevelopmentData
          ? `Imported ${count} DEV sample products (deleted ${deleted.count} stale)`
          : `Imported ${count} products (deleted ${deleted.count} stale)`,
      },
    });

    return {
      provider: loaded.provider,
      source: loaded.source,
      productCount: count,
      deletedCount: deleted.count,
      importId: feedImport.id,
      isDevelopmentData: loaded.isDevelopmentData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        message,
      },
    });
    throw error;
  }
}
