/**
 * Best-effort Partner Ads import during Vercel build (DATABASE_URL is available there).
 * Always exits 0 so a partial/slow import never blocks deploying the app.
 *
 * Time budget: IMPORT_BUILD_BUDGET_MS (default 10 minutes).
 * Large feeds (Booktok / Med24 / Skisport) are imported last.
 * Cron + later deploys continue via TTL until the catalog is full.
 */
import "dotenv/config";
import {
  PARTNER_ADS_FEEDS,
  type PartnerAdsFeedConfig,
} from "../src/lib/feeds/partner-ads-registry";
import { importPartnerAdsFeed } from "../src/lib/feeds/partner-ads-import";
import { prisma } from "../src/lib/db";

/** Feed ids known to be very large — import after smaller shops. */
const LARGE_FEED_IDS = new Set(["4330", "522", "2767"]);

const DEFAULT_BUDGET_MS = 10 * 60 * 1000;

function feedsByPriority(): PartnerAdsFeedConfig[] {
  const small = PARTNER_ADS_FEEDS.filter((f) => !LARGE_FEED_IDS.has(f.feedId));
  const large = PARTNER_ADS_FEEDS.filter((f) => LARGE_FEED_IDS.has(f.feedId));
  return [...small, ...large];
}

function budgetMs(): number {
  const raw = process.env.IMPORT_BUILD_BUDGET_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_BUDGET_MS;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[import-feeds-on-build] DATABASE_URL missing — skip import (local/dev).",
    );
    return;
  }

  const budget = budgetMs();
  const started = Date.now();
  const feeds = feedsByPriority();
  console.log(
    `[import-feeds-on-build] importing up to ${feeds.length} feeds (budget ${Math.round(budget / 1000)}s)…`,
  );

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let deferred = 0;

  for (const feed of feeds) {
    if (Date.now() - started > budget) {
      deferred += 1;
      console.log(
        `[import-feeds-on-build] time budget hit — deferring ${feed.label} (+ remaining)`,
      );
      deferred += feeds.length - feeds.indexOf(feed) - 1;
      break;
    }

    console.log(`→ ${feed.label} (feedid=${feed.feedId})…`);
    try {
      const outcome = await importPartnerAdsFeed(feed, { force: false });
      if (outcome.ok && outcome.skipped) {
        skipped += 1;
        console.log(`  skip: ${outcome.reason}`);
      } else if (outcome.ok) {
        imported += 1;
        console.log(
          `  ok: ${outcome.productCount} products (deleted ${outcome.deletedCount} stale)`,
        );
      } else {
        failed += 1;
        console.error(`  failed: ${outcome.error}`);
      }
    } catch (error) {
      failed += 1;
      console.error(
        `  failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        imported,
        skipped,
        failed,
        deferred,
        elapsedMs: Date.now() - started,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // Never fail the Vercel build because of import issues
    console.error("[import-feeds-on-build] unexpected error (ignored):", err);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
