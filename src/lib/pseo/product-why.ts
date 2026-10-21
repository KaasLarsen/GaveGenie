import type { LandingFilters } from "./taxonomy";
import {
  INTERESTS,
  OCCASIONS,
  RECIPIENTS,
  interestSeoTag,
  occasionSeoTag,
  recipientSeoTag,
} from "./taxonomy";

export type WhyProductInput = {
  title: string;
  brand: string | null;
  category: string | null;
  tags: string[];
  priceOre: number | null;
};

function firstInterestLabel(tags: string[]): string | null {
  for (const interest of INTERESTS) {
    if (tags.includes(interestSeoTag(interest.id))) return interest.label;
  }
  return null;
}

function hasTag(tags: string[], tag: string): boolean {
  return tags.includes(tag);
}

/**
 * Deterministic Danish “why this gift” line for SEO guide cards.
 * No LLM — templates from filters + product tags/category/brand.
 */
export function buildLandingWhy(
  product: WhyProductInput,
  filters: LandingFilters,
): string {
  const brand = product.brand?.trim();
  const category = product.category?.split(">")[0]?.trim();
  const interest = firstInterestLabel(product.tags);
  const priceHint =
    product.priceOre != null && product.priceOre <= 200_00
      ? " til en overkommelig pris"
      : product.priceOre != null && product.priceOre >= 600_00
        ? " som en mere markant gave"
        : "";

  if (filters.recipientId === "ham") {
    if (interest) {
      return `Passer til ham med sans for ${interest}${priceHint} — konkret og brugbart frem for generisk fyld.`;
    }
    if (brand) {
      return `${brand}-valget rammer godt som gave til ham: tydelig kvalitet uden at gætte for vildt.`;
    }
    return `Et konkret bud til ham${category ? ` inden for ${category.toLowerCase()}` : ""}${priceHint}.`;
  }

  if (filters.recipientId === "hende") {
    if (interest) {
      return `Et gennemtænkt bud til hende, der går op i ${interest}${priceHint}.`;
    }
    if (brand) {
      return `${brand} er et sikkert, stilrent valg til hende — personligt uden at blive anonymt.`;
    }
    return `Rammesikkert til hende${category ? ` i ${category.toLowerCase()}` : ""}${priceHint}.`;
  }

  if (filters.recipientId) {
    const recipient = RECIPIENTS.find((r) => r.id === filters.recipientId);
    const phrase = recipient?.phrase ?? "modtageren";
    if (interest) {
      return `Gaven ${phrase} med interesse for ${interest}${priceHint}.`;
    }
    return `Et filtreret forslag ${phrase}${priceHint}.`;
  }

  if (filters.occasionId === "jul") {
    if (hasTag(product.tags, occasionSeoTag("jul"))) {
      return `Har jule-energi uden at være tom pynt — godt under træet${priceHint}.`;
    }
    if (interest) {
      return `Stærk julegave til dem, der elsker ${interest}${priceHint}.`;
    }
    return `Klar julegaveidé${category ? ` fra ${category.toLowerCase()}` : ""}${priceHint}.`;
  }

  if (filters.occasionId) {
    const occasion = OCCASIONS.find((o) => o.id === filters.occasionId);
    const label = occasion?.label ?? "anledningen";
    if (interest) {
      return `Passer til ${label} og en modtager med sans for ${interest}${priceHint}.`;
    }
    return `Et konkret forslag til ${label}${priceHint}.`;
  }

  if (interest) {
    return `Matcher interessen for ${interest}${priceHint}.`;
  }
  if (brand) {
    return `${brand}: et konkret katalogforslag${priceHint}.`;
  }
  return `Udvalgt fra kataloget som en konkret gaveidé${priceHint}.`;
}
