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
});
