import path from "node:path";
import { describe, expect, it } from "vitest";
import { SampleFeedAdapter } from "./sample-adapter";

describe("SampleFeedAdapter", () => {
  it("loads DEV sample feed and marks all products as samples", async () => {
    const adapter = new SampleFeedAdapter(
      path.join(process.cwd(), "data/feeds/sample-dev.json"),
    );
    const result = await adapter.load();

    expect(result.isDevelopmentData).toBe(true);
    expect(result.provider).toBe("sample-dev");
    expect(result.products.length).toBeGreaterThan(5);
    for (const product of result.products) {
      expect(product.isSample).toBe(true);
      expect(product.provider).toBe("sample-dev");
      expect(product.productUrl).toMatch(/^https:\/\/example\.com\//);
    }
  });
});
