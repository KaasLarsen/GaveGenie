import { describe, expect, it } from "vitest";
import {
  buildCandidateWhere,
  mergeProductsByQueryOrder,
  preferenceSearchTokens,
  toPreferences,
} from "./finder";
import {
  buildTsQueryString,
  buildWeightedSearchParts,
  MIN_RELEVANCE_SCORE,
} from "./search";

describe("preferenceSearchTokens", () => {
  it("extracts unique tokens from preferences", () => {
    const tokens = preferenceSearchTokens(
      toPreferences({
        query: "skøjter til voksen",
        recipient: "far",
        occasion: "fødselsdag",
      }),
    );
    // å strips via NFKD; æ/ø stay as letters under simple normalize
    // Interest/occasion drive FTS — recipient "far" is used in ranking, not retrieval
    expect(tokens).toContain("skøjter");
    expect(tokens).toContain("voksen");
    expect(tokens).toContain("fødselsdag");
    expect(tokens).not.toContain("far");
  });

  it("uses interest tokens for FTS (not recipient filler)", () => {
    const tokens = preferenceSearchTokens(
      toPreferences({
        query: "gave til far der elsker kaffe",
      }),
    );
    expect(tokens).toContain("kaffe");
    expect(tokens).not.toContain("elsker");
    expect(tokens).not.toContain("far");
    expect(tokens).not.toContain("gave");
  });

  it("retrieves on vin for a mom who loves wine", () => {
    const tokens = preferenceSearchTokens(
      toPreferences({ query: "søde mor på 65 som elsker vin" }),
    );
    expect(tokens).toEqual(["vin"]);
  });
});

describe("buildTsQueryString", () => {
  it("uses prefix only for longer tokens", () => {
    expect(buildTsQueryString(["kaffe", "krus"])).toBe("kaffe:* | krus:*");
  });

  it("keeps short tokens exact so vin does not match vinter", () => {
    expect(buildTsQueryString(["vin"])).toBe("vin");
  });

  it("returns null for empty or unsafe tokens", () => {
    expect(buildTsQueryString([])).toBeNull();
    expect(buildTsQueryString(["a"])).toBeNull();
  });
});

describe("buildWeightedSearchParts", () => {
  it("normalizes accents for indexing", () => {
    const parts = buildWeightedSearchParts({
      title: "Håndlavet krus",
      brand: "Studio",
      category: "Bolig",
      tags: ["keramik"],
      description: "Til kaffe på båden",
    });
    expect(parts.title).toBe("handlavet krus");
    expect(parts.meta).toContain("studio");
    expect(parts.meta).toContain("keramik");
    expect(parts.description).toContain("baden");
  });
});

describe("buildCandidateWhere (budget fallback)", () => {
  it("excludes samples and applies soft budget", () => {
    const where = buildCandidateWhere(
      toPreferences({ query: "plakat", budgetMinDkk: 100, budgetMaxDkk: 300 }),
      { excludeSamples: true },
    );

    expect(where).toHaveProperty("AND");
    const and = (where as { AND: unknown[] }).AND;
    expect(and).toEqual(
      expect.arrayContaining([
        { isSample: false },
        expect.objectContaining({ OR: expect.any(Array) }),
      ]),
    );
  });

  it("returns empty object when nothing to filter", () => {
    expect(
      buildCandidateWhere(toPreferences({ query: "kaffe" }), {
        excludeSamples: false,
      }),
    ).toEqual({});
  });
});

describe("MIN_RELEVANCE_SCORE", () => {
  it("is above pure budget-only scores", () => {
    // budget=1 → 0.25; budget=0.5 → 0.125 — threshold requires some text match
    expect(MIN_RELEVANCE_SCORE).toBeGreaterThan(0.25);
  });
});

describe("findGifts fallback policy", () => {
  it("documents that budget-only newest fallback is gone", async () => {
    // findGifts used to pull Product.findMany({ orderBy: updatedAt }) when FTS
    // missed — that flooded Booktok into every empty search. Empty FTS now
    // yields an empty recommendation list instead.
    const src = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./finder.ts", import.meta.url), "utf8"),
    );
    expect(src).not.toMatch(/orderBy:\s*\{\s*updatedAt:\s*"desc"/);
    expect(src).toMatch(/No budget-only/);
  });
});

describe("mergeProductsByQueryOrder", () => {
  it("dedupes while keeping earlier query priority", () => {
    const a = {
      id: "1",
      title: "A",
      description: null,
      brand: null,
      category: null,
      tags: [] as string[],
      priceOre: 100,
      currency: "DKK",
      imageUrl: null,
      productUrl: "https://example.com/a",
      inStock: true,
      isSample: false,
      retailer: { name: "X" },
    };
    const b = { ...a, id: "2", title: "B" };
    const merged = mergeProductsByQueryOrder([
      [a, b],
      [{ ...a, title: "A-dup" }, { ...b, id: "3", title: "C" }],
    ]);
    expect(merged.map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(merged[0]?.title).toBe("A");
  });
});
