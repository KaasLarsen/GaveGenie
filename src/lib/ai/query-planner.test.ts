import { describe, expect, it } from "vitest";
import { heuristicGiftSearchPlan } from "./query-planner";

describe("heuristicGiftSearchPlan", () => {
  it("turns mom+wine into vin-focused catalog queries", () => {
    const plan = heuristicGiftSearchPlan({
      query: "søde mor på 65 som elsker vin",
    });
    expect(plan.searchQueries.some((q) => /vin/i.test(q))).toBe(true);
    expect(plan.searchQueries.join(" ")).not.toMatch(/elsker|søde|65/i);
    expect(plan.avoidTerms.some((t) => t.includes("herre"))).toBe(true);
  });

  it("expands kaffe interest", () => {
    const plan = heuristicGiftSearchPlan({
      query: "far elsker kaffe",
    });
    expect(plan.searchQueries.some((q) => /kaffe/i.test(q))).toBe(true);
  });

  it("keeps both musik and strikke for mormor (no at glue)", () => {
    const plan = heuristicGiftSearchPlan({
      query: "mormor som elsker musik og at strikke",
    });
    const joined = plan.searchQueries.join(" ").toLowerCase();
    expect(joined).toMatch(/musik/);
    expect(joined).toMatch(/strik/);
    expect(plan.searchQueries).not.toContain("at");
    expect(plan.avoidTerms.some((t) => /leget|børne|borne|baby|kids/i.test(t))).toBe(
      true,
    );
  });
});
