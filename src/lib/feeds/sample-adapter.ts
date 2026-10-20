import { readFile } from "node:fs/promises";
import path from "node:path";
import { sampleFeedSchema } from "../schema";
import { assertNormalizedProduct, dkkToOre } from "../normalize";
import type { NormalizedProduct } from "../types";
import type { FeedAdapter, FeedLoadResult } from "./types";

const DEFAULT_FEED_PATH = path.join(
  process.cwd(),
  "data",
  "feeds",
  "sample-dev.json",
);

/**
 * Development sample feed adapter.
 * All products are marked isSample=true. Never treat as live affiliate data.
 */
export class SampleFeedAdapter implements FeedAdapter {
  readonly provider = "sample-dev";

  constructor(private readonly feedPath: string = DEFAULT_FEED_PATH) {}

  async load(): Promise<FeedLoadResult> {
    const raw = await readFile(this.feedPath, "utf8");
    const parsed = sampleFeedSchema.parse(JSON.parse(raw));

    if (!parsed.meta.isDevelopmentData) {
      throw new Error(
        "Sample feed must set meta.isDevelopmentData=true — refusing to import unlabeled data",
      );
    }

    const products: NormalizedProduct[] = parsed.products.map((item) =>
      assertNormalizedProduct({
        provider: parsed.meta.provider,
        externalId: item.externalId,
        retailerSlug: item.retailerSlug,
        retailerName: item.retailerName,
        retailerWebsite: item.retailerWebsite,
        title: item.title,
        description: item.description,
        brand: item.brand,
        category: item.category,
        tags: item.tags ?? [],
        priceOre: dkkToOre(item.priceDkk ?? null),
        currency: item.currency || "DKK",
        imageUrl: item.imageUrl || undefined,
        productUrl: item.productUrl,
        inStock: item.inStock ?? null,
        isSample: true,
      }),
    );

    return {
      provider: parsed.meta.provider,
      source: this.feedPath,
      products,
      isDevelopmentData: true,
    };
  }
}
