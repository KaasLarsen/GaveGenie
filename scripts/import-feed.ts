/**
 * Import product feeds into Postgres.
 *
 * Default: all Partner Ads feeds from the registry (live affiliate data).
 * Skips feeds whose last successful import is within FEED_CACHE_TTL_HOURS
 * (default 24h) so we do not hammer Partner Ads.
 *
 * Usage:
 *   npm run import:feed
 *   IMPORT_SAMPLE=1 npm run import:feed          # DEV sample only
 *   FEED_ID=2437 npm run import:feed             # one Partner Ads feed
 *   FORCE_FEED_REFRESH=1 npm run import:feed     # ignore TTL / disk cache
 *
 * Gift search never downloads feeds — only this job (and admin import) does.
 *
 * Requires DATABASE_URL.
 */
import "dotenv/config";
import { SampleFeedAdapter } from "../src/lib/feeds/sample-adapter";
import {
  getPartnerAdsFeedById,
  PARTNER_ADS_FEEDS,
} from "../src/lib/feeds/partner-ads-registry";
import { importPartnerAdsFeed } from "../src/lib/feeds/partner-ads-import";
import { importFeed } from "../src/lib/feeds/import";
import {
  getFeedCacheTtlMs,
  isForceFeedRefresh,
} from "../src/lib/feeds/feed-refresh-policy";
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

  const ttlHours = getFeedCacheTtlMs() / (60 * 60 * 1000);
  const force = isForceFeedRefresh();
  console.log(
    `Importing ${feeds.length} Partner Ads feed(s) (TTL ${ttlHours}h${force ? ", FORCE refresh" : ""})…`,
  );
  console.log(
    "Note: gift search reads Postgres only — this job is the only Partner Ads traffic.",
  );

  const results = [];
  for (const feed of feeds) {
    console.log(`→ ${feed.label} (feedid=${feed.feedId})…`);
    const outcome = await importPartnerAdsFeed(feed, { force });
    if (outcome.ok && outcome.skipped) {
      console.log(`  skip: ${outcome.reason}`);
    } else if (outcome.ok) {
      console.log(
        `  ok: ${outcome.productCount} products, deleted ${outcome.deletedCount} stale` +
          (outcome.cacheHit ? ` [xml=${outcome.cacheHit}]` : ""),
      );
    } else {
      console.error(`  failed: ${outcome.error}`);
    }
    results.push(outcome);
  }

  const imported = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.ok && r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    JSON.stringify({ imported, skipped, failed, feeds: results }, null, 2),
  );

  if (failed > 0) {
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
