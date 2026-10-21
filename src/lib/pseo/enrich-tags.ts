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
 * Soft gender only from clearly gendered interest signals — not board games
 * alone (brætspil) or vague scent words. Keeps til-ham/gameren usable while
 * stopping bare hubs from filling with weak soft matches.
 */
const SOFT_MALE_INTEREST = [
  "gaming",
  "gamer",
  "playstation",
  "xbox",
  "nintendo",
  "controller",
  "headset",
  "computergame",
  "pc-spil",
  "pc spil",
];

const SOFT_FEMALE_INTEREST = [
  "parfume",
  "makeup",
  "hudpleje",
  "skønhed",
  "skoenhed",
  "beauty",
  "spa",
  "creme",
];

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

  // Soft recipient from strong gendered-interest signals (not bare "duft").
  // Board games may soft-map to ham so til-ham/gameren stays populated;
  // bare hubs demote them via giftability ranking.
  if (
    !isChild &&
    !seoTags.has(recipientSeoTag("ham")) &&
    !seoTags.has(recipientSeoTag("hende"))
  ) {
    const softMale = matchesKeywords(blob, SOFT_MALE_INTEREST);
    const softFemale = matchesKeywords(blob, SOFT_FEMALE_INTEREST);
    const boardGame =
      seoTags.has(interestSeoTag("gameren")) &&
      matchesKeywords(blob, ["brætspil", "braetspil", "boardgame"]);
    if ((softMale || boardGame) && !softFemale) {
      seoTags.add(recipientSeoTag("ham"));
    } else if (softFemale && !softMale && !boardGame) {
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
