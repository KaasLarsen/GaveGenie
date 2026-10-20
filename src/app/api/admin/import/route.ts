import { NextResponse } from "next/server";
import { SampleFeedAdapter } from "@/lib/feeds/sample-adapter";
import { PartnerAdsAdapter } from "@/lib/feeds/partner-ads-adapter";
import {
  getPartnerAdsFeedById,
  getPartnerAdsFeedByProvider,
  PARTNER_ADS_FEEDS,
} from "@/lib/feeds/partner-ads-registry";
import { importFeed, type ImportResult } from "@/lib/feeds/import";

export const runtime = "nodejs";
/** Large feeds (esp. Booktok) may exceed serverless limits — prefer CLI for full sync. */
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type ImportBody = {
  provider?: string;
  feedId?: string;
};

/**
 * POST /api/admin/import
 * Authorization: Bearer <ADMIN_SECRET>
 * Body (optional):
 *   { "provider": "sample-dev" }
 *   { "provider": "partner-ads" }           // all registry feeds
 *   { "provider": "partner-ads-2437" }      // one feed
 *   { "feedId": "2437" }                    // one feed by id
 *
 * Note: Full Partner Ads sync (esp. Booktok ~99k) is best run via
 * `npm run import:feed` to avoid serverless timeouts.
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
      const results: Array<ImportResult | { error: string; feedId: string }> =
        [];
      for (const feed of PARTNER_ADS_FEEDS) {
        try {
          results.push(await importFeed(new PartnerAdsAdapter(feed)));
        } catch (error) {
          results.push({
            feedId: feed.feedId,
            error: error instanceof Error ? error.message : "Import failed",
          });
        }
      }
      return NextResponse.json({
        ok: true,
        provider: "partner-ads",
        results,
        notice:
          "Large feeds may time out on serverless — use npm run import:feed for a full sync.",
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

    const result = await importFeed(new PartnerAdsAdapter(feed));
    return NextResponse.json({
      ok: true,
      ...result,
      notice: "Imported live Partner Ads products.",
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
