import { describe, expect, it } from "vitest";
import { buildLandingWhy } from "./product-why";

const base = {
  title: "Gaming headset",
  brand: "Demo Audio",
  category: "Elektronik",
  tags: ["seo:interesse:gameren", "seo:modtager:ham"],
  priceOre: 399_00,
};

describe("buildLandingWhy", () => {
  it("writes a Danish why for til-ham", () => {
    const why = buildLandingWhy(base, { recipientId: "ham" });
    expect(why.toLowerCase()).toMatch(/ham/);
    expect(why.length).toBeGreaterThan(20);
  });

  it("writes a Danish why for til-hende", () => {
    const why = buildLandingWhy(
      {
        ...base,
        title: "Eau de parfum",
        tags: ["seo:interesse:skoenhed", "seo:modtager:hende"],
      },
      { recipientId: "hende" },
    );
    expect(why.toLowerCase()).toMatch(/hende/);
  });

  it("writes a Christmas-flavoured why for jul", () => {
    const why = buildLandingWhy(
      {
        ...base,
        title: "Chokoladejulekalender",
        tags: ["seo:anledning:jul"],
        priceOre: 179_00,
      },
      { occasionId: "jul" },
    );
    expect(why.toLowerCase()).toMatch(/jul/);
  });

  it("is deterministic", () => {
    expect(buildLandingWhy(base, { recipientId: "ham" })).toBe(
      buildLandingWhy(base, { recipientId: "ham" }),
    );
  });
});
