import type { PartnerAdsFeedConfig } from "./partner-ads-registry";
import { partnerAdsProviderKey } from "./partner-ads-registry";
import { PartnerAdsAdapter } from "./partner-ads-adapter";
import { importFeed, type ImportResult } from "./import";
import {
  isForceFeedRefresh,
  shouldSkipPartnerAdsImport,
} from "./feed-refresh-policy";

export type PartnerAdsImportOutcome =
  | ({
      ok: true;
      skipped: false;
      cacheHit?: string;
    } & ImportResult)
  | {
      ok: true;
      skipped: true;
      provider: string;
      feedId: string;
      label: string;
      reason: string;
      lastImportAt?: string;
    }
  | {
      ok: false;
      skipped: false;
      feedId: string;
      label: string;
      error: string;
    };

/**
 * Import one Partner Ads feed, skipping network+DB work when a successful
 * import already ran within the TTL (unless force).
 */
export async function importPartnerAdsFeed(
  feed: PartnerAdsFeedConfig,
  opts: { force?: boolean } = {},
): Promise<PartnerAdsImportOutcome> {
  const force = Boolean(opts.force) || isForceFeedRefresh();
  const provider = partnerAdsProviderKey(feed.feedId);

  const gate = await shouldSkipPartnerAdsImport(provider, { force });
  if (gate.skip) {
    return {
      ok: true,
      skipped: true,
      provider,
      feedId: feed.feedId,
      label: feed.label,
      reason: gate.reason ?? "fresh",
      lastImportAt: gate.lastImportAt?.toISOString(),
    };
  }

  try {
    const adapter = new PartnerAdsAdapter(feed, { forceRefresh: force });
    const result = await importFeed(adapter);
    return {
      ok: true,
      skipped: false,
      cacheHit: adapter.lastLoadMeta?.cacheHit,
      ...result,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      feedId: feed.feedId,
      label: feed.label,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
