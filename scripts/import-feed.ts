/**
 * Import product feeds into Postgres.
 *
 * Default: all Partner Ads feeds from the registry (live affiliate data).
 *
 * Usage:
 *   npm run import:feed
 *   IMPORT_SAMPLE=1 npm run import:feed          # DEV sample only
 *   FEED_ID=2437 npm run import:feed             # one Partner Ads feed
 *
 * Requires DATABASE_URL.
 */
import "dotenv/config";
import { SampleFeedAdapter } from "../src/lib/feeds/sample-adapter";
import { PartnerAdsAdapter } from "../src/lib/feeds/partner-ads-adapter";
import {
  getPartnerAdsFeedById,
  PARTNER_ADS_FEEDS,
} from "../src/lib/feeds/partner-ads-registry";
import { importFeed } from "../src/lib/feeds/import";
import { prisma } from "../src/lib/db";

async function importSample() {
  const adapter = new SampleFeedAdapter();
  console.log("Importing DEV sample feed (not live affiliate data)…");
  const result = await importFeed(adapter);
  console.log(
    JSON.stringify(
      {
        ...result,
        warning:
          "All imported products are development samples. Never invent live products.",
      },
      null,
      2,
    ),
  );
}

async function importPartnerAdsFeeds() {
  const feedIdFilter = process.env.FEED_ID?.trim();
  const feeds = feedIdFilter
    ? (() => {
        const feed = getPartnerAdsFeedById(feedIdFilter);
        if (!feed) {
          throw new Error(
            `Unknown FEED_ID=${feedIdFilter}. Known: ${PARTNER_ADS_FEEDS.map((f) => f.feedId).join(", ")}`,
          );
        }
        return [feed];
      })()
    : [...PARTNER_ADS_FEEDS];

  console.log(
    `Importing ${feeds.length} Partner Ads feed(s) (live affiliate data)…`,
  );

  const results = [];
  for (const feed of feeds) {
    console.log(`→ ${feed.label} (feedid=${feed.feedId})…`);
    try {
      const result = await importFeed(new PartnerAdsAdapter(feed));
      console.log(
        `  ok: ${result.productCount} products, deleted ${result.deletedCount} stale`,
      );
      results.push({ ok: true as const, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  failed: ${message}`);
      results.push({
        ok: false as const,
        feedId: feed.feedId,
        label: feed.label,
        error: message,
      });
    }
  }

  console.log(JSON.stringify({ feeds: results }, null, 2));

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  if (process.env.IMPORT_SAMPLE === "1") {
    await importSample();
    return;
  }

  await importPartnerAdsFeeds();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
