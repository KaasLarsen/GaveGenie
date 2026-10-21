/** Minimum products required before a landing may be indexed. */
export const SEO_MIN_PRODUCTS = 5;

/** Prefix for canonical programmatic SEO tags on Product.tags. */
export const SEO_TAG_PREFIX = "seo:";

export const SEO_YEAR = new Date().getFullYear();

export function seoTag(
  dimension: "modtager" | "interesse" | "anledning" | "budget",
  value: string,
): string {
  return `${SEO_TAG_PREFIX}${dimension}:${value}`;
}
