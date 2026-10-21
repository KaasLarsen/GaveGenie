import { describe, expect, it } from "vitest";
import { textUniquenessRatio } from "./content-blueprints";
import { getHubEditorial, isHubEditorialSlug } from "./hub-editorial";

const stats = {
  productCount: 24,
  minPriceOre: 149_00,
  maxPriceOre: 899_00,
  topCategories: ["Tech", "Vin", "Skønhed"],
};

describe("hub editorial packs", () => {
  it("recognizes the three header hubs", () => {
    expect(isHubEditorialSlug("til-ham")).toBe(true);
    expect(isHubEditorialSlug("til-hende")).toBe(true);
    expect(isHubEditorialSlug("jul")).toBe(true);
    expect(isHubEditorialSlug("til-ham/gameren")).toBe(false);
  });

  it("returns unique hand-written copy for each hub", () => {
    const ham = getHubEditorial("til-ham", stats)!;
    const hende = getHubEditorial("til-hende", stats)!;
    const jul = getHubEditorial("jul", stats)!;

    expect(ham.h1).toMatch(/ham/i);
    expect(hende.h1).toMatch(/hende/i);
    expect(jul.h1).toMatch(/jul/i);

    expect(ham.intro.length).toBeGreaterThanOrEqual(3);
    expect(hende.tips.items.length).toBeGreaterThanOrEqual(3);
    expect(jul.faq).toHaveLength(3);
    expect(ham.productsHeading).toMatch(/ham/i);

    const textHam = `${ham.intro.join(" ")} ${ham.faq.map((f) => f.answer).join(" ")}`;
    const textHende = `${hende.intro.join(" ")} ${hende.faq.map((f) => f.answer).join(" ")}`;
    const textJul = `${jul.intro.join(" ")} ${jul.faq.map((f) => f.answer).join(" ")}`;

    expect(textUniquenessRatio(textHam, textHende)).toBeGreaterThanOrEqual(0.3);
    expect(textUniquenessRatio(textHam, textJul)).toBeGreaterThanOrEqual(0.3);
    expect(textUniquenessRatio(textHende, textJul)).toBeGreaterThanOrEqual(0.3);
  });

  it("is deterministic for the same stats", () => {
    const a = getHubEditorial("jul", stats);
    const b = getHubEditorial("jul", stats);
    expect(a).toEqual(b);
  });
});
