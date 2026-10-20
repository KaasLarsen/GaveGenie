import { tokenizeForSearch } from "./normalize";
import type { GiftPreferences } from "./types";

/** Tokens that describe who the gift is for — weak product signals alone. */
export const RECIPIENT_TOKENS = new Set([
  "mor",
  "far",
  "mama",
  "papa",
  "mamma",
  "pappa",
  "kone",
  "mand",
  "hustru",
  "ægtemand",
  "aegtemand",
  "kæreste",
  "kaereste",
  "partner",
  "veninde",
  "ven",
  "kollega",
  "chef",
  "farmor",
  "farfar",
  "mormor",
  "morfar",
  "søster",
  "soster",
  "bror",
  "datter",
  "son",
  "søn",
  "barn",
  "baby",
  "niece",
  "nevø",
  "nevo",
  "svigerinde",
  "svoger",
  "ona",
  "onkel",
  "tante",
]);

/** Linking / filler verbs that should not drive product retrieval. */
export const WEAK_INTENT_TOKENS = new Set([
  "elsker",
  "kan",
  "godt",
  "li",
  "lide",
  "synes",
  "om",
  "sode",
  "søde",
  "sod",
  "sød",
  "dejlig",
  "dejlige",
  "hyggelig",
  "hyggelige",
  "perfekt",
  "gerne",
  "virkelig",
  "rigtig",
  "aldrig",
  "altid",
]);

const FEMALE_RECIPIENT = new Set([
  "mor",
  "mama",
  "mamma",
  "kone",
  "hustru",
  "veninde",
  "farmor",
  "mormor",
  "søster",
  "soster",
  "datter",
  "niece",
  "svigerinde",
  "tante",
  "ona",
]);

const MALE_RECIPIENT = new Set([
  "far",
  "papa",
  "pappa",
  "mand",
  "ægtemand",
  "aegtemand",
  "ven",
  "farfar",
  "morfar",
  "bror",
  "son",
  "søn",
  "nevø",
  "nevo",
  "svoger",
  "onkel",
  "chef",
]);

/** Product cues that clash with a female recipient. */
const MALE_PRODUCT_CUES = [
  "herre",
  "herrer",
  "herrebukser",
  "herrebuks",
  "herretøj",
  "herretoj",
  "mand",
  "mænd",
  "maend",
  "mande",
  "gentlemen",
  "gentleman",
];

/** Product cues that clash with a male recipient. */
const FEMALE_PRODUCT_CUES = [
  "dame",
  "damer",
  "damebukser",
  "dametøj",
  "dametoj",
  "kvinde",
  "kvinder",
  "pige",
  "piger",
  "lady",
  "ladies",
];

export type GiftIntent = {
  allTokens: string[];
  /** Product/interest words (vin, kaffe, padel…) — drive FTS retrieval. */
  interestTokens: string[];
  /** Who the gift is for (mor, far…). */
  recipientTokens: string[];
  /** Detected recipient gender for mismatch penalties. */
  recipientGender: "female" | "male" | "unknown";
};

function preferenceBlob(preferences: GiftPreferences): string {
  return [
    preferences.query,
    preferences.recipient,
    preferences.occasion,
    preferences.style,
  ]
    .filter(Boolean)
    .join(" ");
}

function isAgeToken(token: string): boolean {
  return /^\d{1,3}$/.test(token);
}

/**
 * Split gift preferences into interest vs recipient signals.
 * Interest tokens should drive catalog retrieval; recipient is for ranking.
 */
export function analyzeGiftIntent(preferences: GiftPreferences): GiftIntent {
  const allTokens = tokenizeForSearch(preferenceBlob(preferences));
  const recipientTokens: string[] = [];
  const interestTokens: string[] = [];

  for (const token of allTokens) {
    if (RECIPIENT_TOKENS.has(token) || isAgeToken(token)) {
      recipientTokens.push(token);
      continue;
    }
    if (WEAK_INTENT_TOKENS.has(token)) {
      continue;
    }
    interestTokens.push(token);
  }

  let recipientGender: GiftIntent["recipientGender"] = "unknown";
  const recipients = new Set([
    ...recipientTokens,
    ...tokenizeForSearch(preferences.recipient ?? ""),
  ]);
  const hasFemale = [...recipients].some((t) => FEMALE_RECIPIENT.has(t));
  const hasMale = [...recipients].some((t) => MALE_RECIPIENT.has(t));
  if (hasFemale && !hasMale) recipientGender = "female";
  else if (hasMale && !hasFemale) recipientGender = "male";

  return {
    allTokens: [...new Set(allTokens)],
    interestTokens: [...new Set(interestTokens)],
    recipientTokens: [...new Set(recipientTokens)],
    recipientGender,
  };
}

/** Penalty in [0, 1] — higher means stronger gender/product clash. */
export function genderMismatchPenalty(
  productText: string,
  recipientGender: GiftIntent["recipientGender"],
): number {
  if (recipientGender === "unknown") return 0;
  const hay = productText.toLowerCase();
  const cues =
    recipientGender === "female" ? MALE_PRODUCT_CUES : FEMALE_PRODUCT_CUES;
  for (const cue of cues) {
    if (hay.includes(cue)) return 0.55;
  }
  return 0;
}
