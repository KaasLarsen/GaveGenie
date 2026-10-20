import { prisma } from "../db";

/** Default: refresh Partner Ads at most once per day. */
export const DEFAULT_FEED_CACHE_TTL_HOURS = 24;

export function getFeedCacheTtlMs(): number {
  const raw = process.env.FEED_CACHE_TTL_HOURS?.trim();
  if (raw) {
    const hours = Number(raw);
    if (!Number.isNaN(hours) && hours >= 0) {
      return hours * 60 * 60 * 1000;
    }
  }
  return DEFAULT_FEED_CACHE_TTL_HOURS * 60 * 60 * 1000;
}

export function isForceFeedRefresh(): boolean {
  return process.env.FORCE_FEED_REFRESH === "1";
}

export function isCacheFresh(
  fetchedAt: Date | string | number,
  now: Date = new Date(),
  ttlMs: number = getFeedCacheTtlMs(),
): boolean {
  if (ttlMs <= 0) return false;
  const at = fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt);
  if (Number.isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() < ttlMs;
}

/**
 * True when we should skip hitting Partner Ads because a successful
 * import for this provider already ran within the TTL window.
 */
export async function shouldSkipPartnerAdsImport(
  provider: string,
  opts: { force?: boolean; now?: Date } = {},
): Promise<{ skip: boolean; reason?: string; lastImportAt?: Date }> {
  if (opts.force || isForceFeedRefresh()) {
    return { skip: false, reason: "forced" };
  }

  const lastOk = await prisma.feedImport.findFirst({
    where: { provider, status: "ok" },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true, startedAt: true },
  });

  const finishedAt = lastOk?.finishedAt ?? lastOk?.startedAt;
  if (!finishedAt) {
    return { skip: false, reason: "never-imported" };
  }

  if (isCacheFresh(finishedAt, opts.now ?? new Date())) {
    return {
      skip: true,
      reason: `last successful import at ${finishedAt.toISOString()} is within TTL`,
      lastImportAt: finishedAt,
    };
  }

  return { skip: false, reason: "stale", lastImportAt: finishedAt };
}
