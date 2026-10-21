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

/**
 * Strong gendered gift signals. Prefer multi-word / apparel phrases —
 * bare "herre"/"women"/"kvinde" matched random book titles.
 */
const STRONG_MALE = [
  "til ham",
  "gave til ham",
  "gaver til ham",
  "gaveideer til ham",
  "herrebekladning",
  "herretoj",
  "herretoej",
  "herremode",
  "herre mode",
  "herre sko",
  "herre ur",
  "herrejakke",
  "herreskjorte",
  "herrebukser",
  "for men",
  "menswear",
  "gentleman",
  "gentlemen",
];

const STRONG_FEMALE = [
  "til hende",
  "gave til hende",
  "gaver til hende",
  "gaveideer til hende",
  "damebekladning",
  "dametoj",
  "dametoej",
  "damemode",
  "dame mode",
  "dame sko",
  "dame taske",
  "dameur",
  "for women",
  "womenswear",
  "ladieswear",
];

const CHILD_SIGNAL = [
  "til born",
  "til barn",
  "til boern",
  "born",
  "boern",
  "barn",
  "baby",
  "kids",
  "child",
  "children",
  "junior",
  "legetoj",
  "legetoej",
  "peppa",
  "disney",
  "bluey",
  "rasmus klump",
  "malebog",
  "opgavebog",
  "skriv og visk",
];

const FEED_GENDER_MALE = new Set([
  "male",
  "men",
  "man",
  "herre",
  "herrer",
  "mande",
  "m",
]);
const FEED_GENDER_FEMALE = new Set([
  "female",
  "women",
  "woman",
  "dame",
  "damer",
  "kvinde",
  "f",
  "w",
]);

function hasStrongMale(blob: string, feedTags: string[]): boolean {
  if (matchesKeywords(blob, STRONG_MALE)) return true;
  return feedTags.some((t) => FEED_GENDER_MALE.has(normalizeText(t)));
}

function hasStrongFemale(blob: string, feedTags: string[]): boolean {
  if (matchesKeywords(blob, STRONG_FEMALE)) return true;
  return feedTags.some((t) => FEED_GENDER_FEMALE.has(normalizeText(t)));
}

function hasChildSignal(blob: string): boolean {
  return matchesKeywords(blob, CHILD_SIGNAL);
}

/**
 * Strip previous seo:* tags then re-apply from taxonomy matchers.
 * Recipient ham/hende require strong gender signals — never soft-tag
 * every book onto both gift guides.
 */
export function enrichProductSeoTags(
  product: NormalizedProduct,
): NormalizedProduct {
  const blob = buildSearchBlob(product);
  const baseTags = product.tags.filter((t) => !t.startsWith(SEO_TAG_PREFIX));
  const seoTags = new Set<string>();
  const isChild = hasChildSignal(blob);

  for (const r of RECIPIENTS) {
    if (r.id === "ham" || r.id === "hende") continue;
    if (matchesKeywords(blob, r.match.keywords)) {
      seoTags.add(recipientSeoTag(r.id));
    }
  }

  if (isChild) {
    seoTags.add(recipientSeoTag("barn"));
  }

  const male = !isChild && hasStrongMale(blob, baseTags);
  const female = !isChild && hasStrongFemale(blob, baseTags);
  // Exclusive: both → keep neither (ambiguous feed noise).
  if (male && !female) seoTags.add(recipientSeoTag("ham"));
  if (female && !male) seoTags.add(recipientSeoTag("hende"));

  for (const i of INTERESTS) {
    if (matchesKeywords(blob, i.match.keywords)) {
      seoTags.add(interestSeoTag(i.id));
    }
  }

  // Soft recipient only for clearly gendered interests, never on kids.
  if (
    !isChild &&
    !seoTags.has(recipientSeoTag("ham")) &&
    !seoTags.has(recipientSeoTag("hende"))
  ) {
    const interestIds = [...seoTags]
      .filter((t) => t.startsWith("seo:interesse:"))
      .map((t) => t.slice("seo:interesse:".length));
    if (interestIds.includes("gameren") && !interestIds.includes("skoenhed")) {
      seoTags.add(recipientSeoTag("ham"));
    } else if (
      interestIds.includes("skoenhed") &&
      !interestIds.includes("gameren")
    ) {
      seoTags.add(recipientSeoTag("hende"));
    }
  }

  for (const o of OCCASIONS) {
    if (matchesKeywords(blob, o.match.keywords)) {
      seoTags.add(occasionSeoTag(o.id));
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
