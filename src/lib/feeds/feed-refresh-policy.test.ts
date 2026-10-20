import { describe, expect, it, afterEach } from "vitest";
import {
  DEFAULT_FEED_CACHE_TTL_HOURS,
  getFeedCacheTtlMs,
  isCacheFresh,
} from "./feed-refresh-policy";

describe("isCacheFresh", () => {
  it("treats recent timestamps as fresh within TTL", () => {
    const now = new Date("2026-10-20T12:00:00.000Z");
    const fetchedAt = new Date("2026-10-20T06:00:00.000Z");
    expect(isCacheFresh(fetchedAt, now, 24 * 60 * 60 * 1000)).toBe(true);
  });

  it("treats old timestamps as stale", () => {
    const now = new Date("2026-10-20T12:00:00.000Z");
    const fetchedAt = new Date("2026-10-18T12:00:00.000Z");
    expect(isCacheFresh(fetchedAt, now, 24 * 60 * 60 * 1000)).toBe(false);
  });

  it("returns false when TTL is 0", () => {
    expect(isCacheFresh(new Date(), new Date(), 0)).toBe(false);
  });
});

describe("getFeedCacheTtlMs", () => {
  afterEach(() => {
    delete process.env.FEED_CACHE_TTL_HOURS;
  });

  it("defaults to 24 hours", () => {
    delete process.env.FEED_CACHE_TTL_HOURS;
    expect(getFeedCacheTtlMs()).toBe(
      DEFAULT_FEED_CACHE_TTL_HOURS * 60 * 60 * 1000,
    );
  });

  it("reads FEED_CACHE_TTL_HOURS", () => {
    process.env.FEED_CACHE_TTL_HOURS = "12";
    expect(getFeedCacheTtlMs()).toBe(12 * 60 * 60 * 1000);
  });
});
