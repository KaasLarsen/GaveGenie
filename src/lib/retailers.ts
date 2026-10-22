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
