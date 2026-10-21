import { describe, expect, it } from "vitest";
import { resolveSlug } from "./slug";

describe("resolveSlug", () => {
  it("resolves recipient hub", () => {
    const r = resolveSlug(["til-ham"]);
    expect(r).not.toBeNull();
    expect(r!.pathPattern).toBe("recipient");
    expect(r!.filters.recipientId).toBe("ham");
    expect(r!.slug).toBe("til-ham");
  });

  it("resolves recipient + interest", () => {
    const r = resolveSlug(["til-ham", "gameren"]);
    expect(r).not.toBeNull();
    expect(r!.pathPattern).toBe("recipient-interest");
    expect(r!.filters).toEqual({
      recipientId: "ham",
      interestId: "gameren",
    });
    expect(r!.crumbs).toHaveLength(2);
  });

  it("resolves occasion + budget", () => {
    const r = resolveSlug(["jul", "under-200"]);
    expect(r).not.toBeNull();
    expect(r!.pathPattern).toBe("occasion-budget");
    expect(r!.filters.occasionId).toBe("jul");
    expect(r!.filters.budgetId).toBe("under-200");
    expect(r!.filters.budgetMaxOre).toBe(200_00);
  });

  it("rejects unknown segments", () => {
    expect(resolveSlug(["ukendt"])).toBeNull();
    expect(resolveSlug(["til-ham", "ukendt"])).toBeNull();
    expect(resolveSlug([])).toBeNull();
    expect(resolveSlug(["a", "b", "c"])).toBeNull();
  });

  it("rejects mismatched two-segment combos", () => {
    // interest as first segment is invalid
    expect(resolveSlug(["gameren", "til-ham"])).toBeNull();
    // budget as first segment is invalid
    expect(resolveSlug(["under-200", "jul"])).toBeNull();
  });
});
