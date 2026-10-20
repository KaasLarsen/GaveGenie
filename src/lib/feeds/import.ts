import { prisma } from "../db";
import type { FeedAdapter } from "./types";

export type ImportResult = {
  provider: string;
  source: string;
  productCount: number;
  importId: string;
  isDevelopmentData: boolean;
};

/**
 * Upsert products by (provider, externalId). Creates retailers as needed.
 */
export async function importFeed(adapter: FeedAdapter): Promise<ImportResult> {
  const loaded = await adapter.load();

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

    for (const product of loaded.products) {
      const retailer = await prisma.retailer.upsert({
        where: { slug: product.retailerSlug },
        create: {
          slug: product.retailerSlug,
          name: product.retailerName,
          website: product.retailerWebsite,
        },
        update: {
          name: product.retailerName,
          website: product.retailerWebsite,
        },
      });

      await prisma.product.upsert({
        where: {
          provider_externalId: {
            provider: product.provider,
            externalId: product.externalId,
          },
        },
        create: {
          provider: product.provider,
          externalId: product.externalId,
          retailerId: retailer.id,
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
          retailerId: retailer.id,
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

      count += 1;
    }

    await prisma.feedImport.update({
      where: { id: feedImport.id },
      data: {
        status: "ok",
        productCount: count,
        finishedAt: new Date(),
        message: loaded.isDevelopmentData
          ? `Imported ${count} DEV sample products`
          : `Imported ${count} products`,
      },
    });

    return {
      provider: loaded.provider,
      source: loaded.source,
      productCount: count,
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
