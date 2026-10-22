import { normalizeText } from "./normalize";

const MASS_CATALOG_RETAILER_NAMES = new Set([
  "booktok",
  "booktok.dk",
  "med24",
  "med24.dk",
]);

/** Huge affiliate catalogs that flood FTS / “newest” fallbacks. */
export function isMassCatalogRetailer(name: string): boolean {
  const key = name.trim().toLowerCase();
  if (MASS_CATALOG_RETAILER_NAMES.has(key)) return true;
  return key.includes("booktok") || key.includes("med24");
}

/** Kids-vertical shops — wrong for mormor/mor/far unless child intent. */
export function isChildrenCatalogRetailer(name: string): boolean {
  const key = normalizeText(name);
  if (!key) return false;
  // normalizeText keeps æ/ø as letters (NFKD does not split them)
  return (
    key.includes("kære børn") ||
    key.includes("kaere born") ||
    key.includes("kare born") ||
    key.includes("barnetsrum") ||
    key.includes("barnets rum")
  );
}

/** Product cues that scream children’s gift / legetøj (normalized forms). */
const CHILD_PRODUCT_CUES = [
  "legetoj",
  "legetoej",
  "seo:modtager:barn",
  "til born",
  "til barn",
  "til boern",
  "borne",
  "boerne",
  "barne",
  "baby",
  "kids",
  "junior",
  "disney",
  "peppa",
  "bluey",
];

function blobHasCue(blob: string, cue: string): boolean {
  const t = normalizeText(cue);
  if (!t) return false;
  if (t.length <= 4) {
    return (
      blob === t ||
      blob.startsWith(`${t} `) ||
      blob.endsWith(` ${t}`) ||
      blob.includes(` ${t} `)
    );
  }
  return blob.includes(t);
}

/**
 * True when product tags/title/category/retailer look like a child gift.
 * Used to keep KÆRE BØRN out of adult searches (mormor, mor, …).
 */
export function looksLikeChildProduct(product: {
  title: string;
  category?: string | null;
  tags?: string[];
  retailerName: string;
}): boolean {
  if (isChildrenCatalogRetailer(product.retailerName)) return true;
  const tags = product.tags ?? [];
  if (tags.some((t) => t === "seo:modtager:barn" || t.includes("modtager:barn"))) {
    return true;
  }
  const blob = normalizeText(
    [product.title, product.category ?? "", tags.join(" ")].join(" "),
  );
  if (!blob) return false;
  return CHILD_PRODUCT_CUES.some((cue) => blobHasCue(blob, cue));
}

/** Tokens that mean the shopper actually wants a book / reading gift. */
const BOOK_INTENT_TERMS = [
  "bog",
  "boger",
  "bøger",
  "boeger",
  "roman",
  "krimi",
  "novelle",
  "biografi",
  "læs",
  "laes",
  "læse",
  "laese",
  "læser",
  "laeser",
  "læseren",
  "laeseren",
  "book",
  "books",
  "booktok",
];

/**
 * True when the gift request (or planner queries) clearly ask for books.
 * Used to lift the Booktok demotion in the gift finder.
 */
export function hasBookGiftIntent(
  ...parts: Array<string | null | undefined>
): boolean {
  const blob = normalizeText(parts.filter(Boolean).join(" "));
  if (!blob) return false;

  for (const term of BOOK_INTENT_TERMS) {
    const t = normalizeText(term);
    if (!t) continue;
    if (
      blob === t ||
      blob.startsWith(`${t} `) ||
      blob.endsWith(` ${t}`) ||
      blob.includes(` ${t} `)
    ) {
      return true;
    }
  }
  return false;
}
