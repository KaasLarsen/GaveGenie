import { NextResponse } from "next/server";
import {
  PARTNER_ADS_FEEDS,
  type PartnerAdsFeedConfig,
} from "@/lib/feeds/partner-ads-registry";
import { partnerAdsProviderKey } from "@/lib/feeds/partner-ads-registry";
import { importPartnerAdsFeed } from "@/lib/feeds/partner-ads-import";
import { shouldSkipPartnerAdsImport } from "@/lib/feeds/feed-refresh-policy";
import { syncSeoLandings } from "@/lib/pseo/landings";
import { retagProductsMissingSeoTags } from "@/lib/pseo/retag";

export const runtime = "nodejs";
/** Pack as many feeds as fit — large shops (Med24/Booktok) need headroom. */
export const maxDuration = 300;

/** Stop starting new feeds this many ms before the serverless limit. */
const TIME_BUDGET_MS = 240_000;

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;

  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  return (
    (Boolean(cronSecret) && token === cronSecret) ||
    (Boolean(adminSecret) && token === adminSecret)
  );
}

async function listFeedsDue(): Promise<PartnerAdsFeedConfig[]> {
  const due: PartnerAdsFeedConfig[] = [];
  for (const feed of PARTNER_ADS_FEEDS) {
    const provider = partnerAdsProviderKey(feed.feedId);
    const gate = await shouldSkipPartnerAdsImport(provider);
    if (!gate.skip) due.push(feed);
  }
  return due;
}

/**
 * GET/POST /api/cron/import-feeds
 * Authorization: Bearer <CRON_SECRET> (Vercel Cron) or <ADMIN_SECRET>
 *
 * Imports as many due Partner Ads feeds as fit in the time budget so Hobby
 * (daily cron) and Pro (more frequent) both converge on a full catalog.
 */
async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();

  try {
    const due = await listFeedsDue();
    const results = [];

    for (const feed of due) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        results.push({
          feedId: feed.feedId,
          label: feed.label,
          deferred: true,
          reason: "time-budget",
        });
        break;
      }
      results.push({
        feedId: feed.feedId,
        label: feed.label,
        result: await importPartnerAdsFeed(feed, { force: false }),
      });
    }

    const importedAny = results.some((row) => {
      const r = "result" in row ? row.result : null;
      return r && r.ok && !r.skipped;
    });

    let retag: Awaited<ReturnType<typeof retagProductsMissingSeoTags>> | null =
      null;
    let seo: { upserted: number; indexed: number } | null = null;

    // Rewrite seo:* tags (force) so matcher fixes reach production without
    // waiting for Partner Ads TTL — otherwise poisoned ham/hende tags linger.
    if (Date.now() - started < TIME_BUDGET_MS) {
      retag = await retagProductsMissingSeoTags({
        batchSize: 100,
        maxProducts: 4_000,
        force: true,
      });
      seo = retag.seo;
    }

    if (importedAny && !seo && Date.now() - started < TIME_BUDGET_MS) {
      seo = await syncSeoLandings();
    }

    return NextResponse.json({
      ok: true,
      dueCount: due.length,
      processed: results.length,
      results,
      retag,
      seo,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("cron import-feeds failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
