import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { getFeedCacheTtlMs, isCacheFresh, isForceFeedRefresh } from "./feed-refresh-policy";

export type FeedCacheMeta = {
  feedId: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  sourceUrl: string;
  byteLength: number;
};

export function defaultFeedCacheDir(): string {
  return (
    process.env.FEED_CACHE_DIR?.trim() ||
    path.join(process.cwd(), "data", "feeds", "cache")
  );
}

function cachePaths(feedId: string, cacheDir: string) {
  const safe = feedId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    xmlPath: path.join(cacheDir, `partner-ads-${safe}.xml`),
    metaPath: path.join(cacheDir, `partner-ads-${safe}.meta.json`),
  };
}

export async function readFeedCache(
  feedId: string,
  opts: { cacheDir?: string; now?: Date; force?: boolean } = {},
): Promise<{ xml: string; meta: FeedCacheMeta } | null> {
  if (opts.force || isForceFeedRefresh()) return null;

  const dir = opts.cacheDir ?? defaultFeedCacheDir();
  const { xmlPath, metaPath } = cachePaths(feedId, dir);

  try {
    const [xmlBuf, metaRaw, xmlStat] = await Promise.all([
      readFile(xmlPath),
      readFile(metaPath, "utf8"),
      stat(xmlPath),
    ]);
    const meta = JSON.parse(metaRaw) as FeedCacheMeta;
    const fetchedAt = meta.fetchedAt || xmlStat.mtime.toISOString();
    if (!isCacheFresh(fetchedAt, opts.now ?? new Date(), getFeedCacheTtlMs())) {
      return null;
    }
    return {
      xml: xmlBuf.toString("latin1"),
      meta: { ...meta, fetchedAt },
    };
  } catch {
    return null;
  }
}

/**
 * Read cached XML even when TTL has expired (for conditional GET headers).
 */
export async function readFeedCacheIgnoringTtl(
  feedId: string,
  opts: { cacheDir?: string } = {},
): Promise<{ xml: string; meta: FeedCacheMeta } | null> {
  const dir = opts.cacheDir ?? defaultFeedCacheDir();
  const { xmlPath, metaPath } = cachePaths(feedId, dir);
  try {
    const [xmlBuf, metaRaw] = await Promise.all([
      readFile(xmlPath),
      readFile(metaPath, "utf8"),
    ]);
    return {
      xml: xmlBuf.toString("latin1"),
      meta: JSON.parse(metaRaw) as FeedCacheMeta,
    };
  } catch {
    return null;
  }
}

export async function writeFeedCache(
  feedId: string,
  xmlLatin1: string,
  meta: Omit<FeedCacheMeta, "feedId" | "byteLength"> & {
    feedId?: string;
    byteLength?: number;
  },
  opts: { cacheDir?: string } = {},
): Promise<FeedCacheMeta> {
  const dir = opts.cacheDir ?? defaultFeedCacheDir();
  await mkdir(dir, { recursive: true });
  const { xmlPath, metaPath } = cachePaths(feedId, dir);
  const buffer = Buffer.from(xmlLatin1, "latin1");
  const fullMeta: FeedCacheMeta = {
    feedId,
    fetchedAt: meta.fetchedAt,
    etag: meta.etag,
    lastModified: meta.lastModified,
    sourceUrl: meta.sourceUrl,
    byteLength: buffer.byteLength,
  };
  await writeFile(xmlPath, buffer);
  await writeFile(metaPath, JSON.stringify(fullMeta, null, 2), "utf8");
  return fullMeta;
}
