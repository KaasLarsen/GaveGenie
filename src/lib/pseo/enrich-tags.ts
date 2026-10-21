import { normalizeText } from "../normalize";
import type { NormalizedProduct } from "../types";
import { SEO_TAG_PREFIX } from "./constants";
import {
  BUDGETS,
  INTERESTS,
  OCCASIONS,
  RECIPIENTS,
  budgetSeoTag,
  interestSeoTag,
  occasionSeoTag,
  recipientSeoTag,
} from "./taxonomy";

function buildSearchBlob(product: NormalizedProduct): string {
  const parts = [
    product.title,
    product.description ?? "",
    product.category ?? "",
    product.brand ?? "",
    ...product.tags,
  ];
  return normalizeText(parts.join(" "));
}

function matchesKeywords(blob: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    const needle = normalizeText(kw);
    if (!needle) continue;
    if (needle.includes(" ")) {
      if (blob.includes(needle)) return true;
    } else {
      // Word-boundary-ish: spaces around or start/end
      if (
        blob === needle ||
        blob.startsWith(`${needle} `) ||
        blob.endsWith(` ${needle}`) ||
        blob.includes(` ${needle} `)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Strip previous seo:* tags then re-apply from taxonomy matchers. */
export function enrichProductSeoTags(
  product: NormalizedProduct,
): NormalizedProduct {
  const blob = buildSearchBlob(product);
  const baseTags = product.tags.filter((t) => !t.startsWith(SEO_TAG_PREFIX));
  const seoTags = new Set<string>();

  for (const r of RECIPIENTS) {
    if (matchesKeywords(blob, r.match.keywords)) {
      seoTags.add(recipientSeoTag(r.id));
    }
  }

  for (const i of INTERESTS) {
    if (matchesKeywords(blob, i.match.keywords)) {
      seoTags.add(interestSeoTag(i.id));
    }
  }

  for (const o of OCCASIONS) {
    if (matchesKeywords(blob, o.match.keywords)) {
      seoTags.add(occasionSeoTag(o.id));
    }
  }

  // Soft recipient cues from interest tags when feed has no gender field.
  const interestIds = [...seoTags]
    .filter((t) => t.startsWith("seo:interesse:"))
    .map((t) => t.slice("seo:interesse:".length));
  if (!seoTags.has(recipientSeoTag("ham")) && !seoTags.has(recipientSeoTag("hende"))) {
    const maleLean = ["gameren", "tech", "outdoor", "fitness"];
    const femaleLean = ["skoenhed", "bolig", "madentusiasten"];
    if (interestIds.some((id) => maleLean.includes(id))) {
      seoTags.add(recipientSeoTag("ham"));
    }
    if (interestIds.some((id) => femaleLean.includes(id))) {
      seoTags.add(recipientSeoTag("hende"));
    }
  }

  // Soft occasion defaults: gift-worthy catalog items suit birthday/jul loosely
  // when they have any interest/recipient signal — keeps occasion hubs populated
  // without inventing product attributes.
  if (
    [...seoTags].some(
      (t) => t.startsWith("seo:modtager:") || t.startsWith("seo:interesse:"),
    )
  ) {
    seoTags.add(occasionSeoTag("fodselsdag"));
    if (
      blob.includes("gave") ||
      blob.includes("aeske") ||
      blob.includes("æske") ||
      blob.includes("jul") ||
      blob.includes("chokolade") ||
      blob.includes("lys")
    ) {
      seoTags.add(occasionSeoTag("jul"));
    }
  }

  if (product.priceOre !== null && product.priceOre !== undefined) {
    for (const b of BUDGETS) {
      if (product.priceOre <= b.maxOre) {
        seoTags.add(budgetSeoTag(b.id));
      }
    }
  }

  return {
    ...product,
    tags: [...baseTags, ...seoTags].sort(),
  };
}

export function enrichProductsSeoTags(
  products: NormalizedProduct[],
): NormalizedProduct[] {
  return products.map(enrichProductSeoTags);
}
