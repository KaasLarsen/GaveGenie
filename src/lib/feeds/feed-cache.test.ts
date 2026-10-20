import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readFeedCache,
  readFeedCacheIgnoringTtl,
  writeFeedCache,
} from "./feed-cache";

describe("feed-cache", () => {
  let cacheDir: string;

  afterEach(async () => {
    if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
    delete process.env.FORCE_FEED_REFRESH;
  });

  it("writes and reads fresh cache", async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "gg-feed-"));
    const xml = '<?xml version="1.0"?><produkter></produkter>';
    await writeFeedCache(
      "3590",
      xml,
      {
        fetchedAt: new Date().toISOString(),
        sourceUrl: "https://example.com/feed",
        etag: '"abc"',
      },
      { cacheDir },
    );

    const hit = await readFeedCache("3590", { cacheDir });
    expect(hit).not.toBeNull();
    expect(hit!.xml).toBe(xml);
    expect(hit!.meta.etag).toBe('"abc"');
  });

  it("returns null when force refresh is set", async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "gg-feed-"));
    await writeFeedCache(
      "3590",
      "<produkter/>",
      {
        fetchedAt: new Date().toISOString(),
        sourceUrl: "https://example.com/feed",
      },
      { cacheDir },
    );
    process.env.FORCE_FEED_REFRESH = "1";
    expect(await readFeedCache("3590", { cacheDir })).toBeNull();
  });

  it("readFeedCacheIgnoringTtl returns expired entries", async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "gg-feed-"));
    await writeFeedCache(
      "3590",
      "<produkter/>",
      {
        fetchedAt: "2020-01-01T00:00:00.000Z",
        sourceUrl: "https://example.com/feed",
        etag: '"old"',
      },
      { cacheDir },
    );

    expect(await readFeedCache("3590", { cacheDir })).toBeNull();
    const soft = await readFeedCacheIgnoringTtl("3590", { cacheDir });
    expect(soft?.meta.etag).toBe('"old"');
  });
});
