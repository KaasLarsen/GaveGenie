import { describe, expect, it } from "vitest";
import {
  buildLandingCopy,
  textUniquenessRatio,
} from "./content-blueprints";
import { resolveSlug } from "./slug";

const stats = {
  productCount: 18,
  minPriceOre: 129_00,
  maxPriceOre: 899_00,
  topCategories: ["Elektronik", "Hobby", "Spil"],
};

describe("buildLandingCopy", () => {
  it("builds Danish H1, intro, FAQ and metadata for recipient-interest", () => {
    const resolved = resolveSlug(["til-ham", "gameren"])!;
    const copy = buildLandingCopy(resolved, stats);
    expect(copy.h1).toMatch(/gaver/i);
    expect(copy.h1).toMatch(/gamer/i);
    expect(copy.intro).toHaveLength(2);
    expect(copy.intro[0].length).toBeGreaterThan(40);
    expect(copy.faq).toHaveLength(3);
    expect(copy.metaTitle.length).toBeLessThanOrEqual(60);
    expect(copy.metaDescription).toMatch(/18/);
    expect(copy.metaDescription).toMatch(/129/);
  });

  it("keeps sibling pages sufficiently unique (≥30% token distance)", () => {
    const a = resolveSlug(["til-ham", "gameren"])!;
    const b = resolveSlug(["til-ham", "tech"])!;
    const copyA = buildLandingCopy(a, stats);
    const copyB = buildLandingCopy(b, {
      ...stats,
      topCategories: ["Elektronik", "Gadget"],
    });
    const textA = `${copyA.intro[0]} ${copyA.intro[1]} ${copyA.faq.map((f) => f.answer).join(" ")}`;
    const textB = `${copyB.intro[0]} ${copyB.intro[1]} ${copyB.faq.map((f) => f.answer).join(" ")}`;
    const uniqueness = textUniquenessRatio(textA, textB);
    expect(uniqueness).toBeGreaterThanOrEqual(0.3);
  });

  it("is deterministic for the same slug", () => {
    const resolved = resolveSlug(["jul", "under-500"])!;
    const first = buildLandingCopy(resolved, stats);
    const second = buildLandingCopy(resolved, stats);
    expect(first).toEqual(second);
  });
});

describe("textUniquenessRatio", () => {
  it("returns 0 for identical text", () => {
    expect(textUniquenessRatio("hej verden test", "hej verden test")).toBe(0);
  });

  it("returns high ratio for disjoint text", () => {
    expect(
      textUniquenessRatio(
        "kaffe krus keramik bolig",
        "gaming headset controller spil",
      ),
    ).toBeGreaterThan(0.8);
  });
});
