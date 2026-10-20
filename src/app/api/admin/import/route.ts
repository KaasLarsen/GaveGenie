import { NextResponse } from "next/server";
import { SampleFeedAdapter } from "@/lib/feeds/sample-adapter";
import {
  getPartnerAdsFeedById,
  getPartnerAdsFeedByProvider,
  PARTNER_ADS_FEEDS,
} from "@/lib/feeds/partner-ads-registry";
import { importPartnerAdsFeed } from "@/lib/feeds/partner-ads-import";
import { importFeed } from "@/lib/feeds/import";

export const runtime = "nodejs";
/** Large feeds (esp. Booktok) may exceed serverless limits — prefer CLI for full sync. */
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type ImportBody = {
  provider?: string;
  feedId?: string;
  /** Bypass TTL skip + disk cache (costs Partner Ads bandwidth) */
  force?: boolean;
};

/**
 * POST /api/admin/import
 * Authorization: Bearer <ADMIN_SECRET>
 * Body (optional):
 *   { "provider": "sample-dev" }
 *   { "provider": "partner-ads" }           // all registry feeds (respects TTL)
 *   { "provider": "partner-ads-2437" }      // one feed
 *   { "feedId": "2437", "force": true }     // one feed, ignore TTL
 *
 * Gift search never downloads Partner Ads feeds. This endpoint (and the CLI)
 * are the only places that hit feed URLs. Fresh imports within FEED_CACHE_TTL_HOURS
 * (default 24h) are skipped unless force=true.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return unauthorized();
  }

  let body: ImportBody = {};
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    // empty body is fine
  }

  const provider = body.provider?.trim() || "partner-ads";
  const feedId = body.feedId?.trim();
  const force = Boolean(body.force);

  try {
    if (provider === "sample-dev") {
      const result = await importFeed(new SampleFeedAdapter());
      return NextResponse.json({
        ok: true,
        ...result,
        notice:
          "Imported development sample products only. Not live affiliate data.",
      });
    }

    if (provider === "partner-ads" && !feedId) {
      const results = [];
      for (const feed of PARTNER_ADS_FEEDS) {
        results.push(await importPartnerAdsFeed(feed, { force }));
      }
      return NextResponse.json({
        ok: true,
        provider: "partner-ads",
        results,
        notice:
          "Skips feeds imported within TTL unless force=true. Prefer CLI for full sync of large feeds.",
      });
    }

    const feed =
      (feedId ? getPartnerAdsFeedById(feedId) : undefined) ||
      getPartnerAdsFeedByProvider(provider);

    if (!feed) {
      return NextResponse.json(
        {
          error:
            'Unknown provider. Use "sample-dev", "partner-ads", "partner-ads-{feedId}", or { "feedId": "…" }.',
          knownFeedIds: PARTNER_ADS_FEEDS.map((f) => f.feedId),
        },
        { status: 400 },
      );
    }

    const result = await importPartnerAdsFeed(feed, { force });
    return NextResponse.json({
      ...result,
      notice: result.skipped
        ? "Skipped — last import still within TTL. Pass force=true to refresh."
        : "Imported live Partner Ads products.",
    });
  } catch (error) {
    console.error("admin import failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}
