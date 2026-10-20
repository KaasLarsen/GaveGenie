import { describe, expect, it } from "vitest";
import {
  giftPreferencesSchema,
  openaiWhyResponseSchema,
  sampleFeedSchema,
} from "./schema";

describe("giftPreferencesSchema", () => {
  it("accepts valid Danish preferences", () => {
    const parsed = giftPreferencesSchema.parse({
      query: "noget hyggeligt til min mor",
      recipient: "Mor",
      occasion: "Fødselsdag",
      budgetMinDkk: 100,
      budgetMaxDkk: 400,
      style: "klassisk",
    });
    expect(parsed.query).toContain("mor");
  });

  it("rejects too-short queries", () => {
    expect(() => giftPreferencesSchema.parse({ query: "a" })).toThrow();
  });
});

describe("openaiWhyResponseSchema", () => {
  it("validates recommendation payloads", () => {
    const parsed = openaiWhyResponseSchema.parse({
      recommendations: [
        { productId: "abc", why: "Passer godt til hendes stil." },
      ],
    });
    expect(parsed.recommendations).toHaveLength(1);
  });

  it("rejects invented empty whys", () => {
    expect(() =>
      openaiWhyResponseSchema.parse({
        recommendations: [{ productId: "abc", why: "" }],
      }),
    ).toThrow();
  });
});

describe("sampleFeedSchema", () => {
  it("requires isDevelopmentData true", () => {
    expect(() =>
      sampleFeedSchema.parse({
        meta: {
          provider: "sample-dev",
          label: "x",
          isDevelopmentData: false,
        },
        products: [],
      }),
    ).toThrow();
  });
});
