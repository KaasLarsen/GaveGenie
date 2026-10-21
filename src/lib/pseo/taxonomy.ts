import { seoTag } from "./constants";

export type TaxonomyMatch = {
  /** Keywords matched against normalized title/description/category/tags blob. */
  keywords: string[];
};

export type RecipientDef = {
  /** URL segment, e.g. "til-ham" */
  slug: string;
  /** Short id used in seo tags, e.g. "ham" */
  id: string;
  /** Danish label for headlines */
  label: string;
  /** Phrase used in H1, e.g. "til ham" */
  phrase: string;
  match: TaxonomyMatch;
};

export type InterestDef = {
  slug: string;
  id: string;
  label: string;
  /** Used in headlines: "der gamer" / "med interesse for tech" */
  headlineHint: string;
  match: TaxonomyMatch;
};

export type OccasionDef = {
  slug: string;
  id: string;
  label: string;
  match: TaxonomyMatch;
};

export type BudgetDef = {
  /** URL segment without "under-" prefix for occasion paths uses full slug */
  slug: string;
  id: string;
  label: string;
  maxOre: number;
};

export const RECIPIENTS: RecipientDef[] = [
  {
    slug: "til-ham",
    id: "ham",
    label: "ham",
    phrase: "til ham",
    match: {
      // Kept for docs/tests; enrich-tags uses STRONG_MALE (avoids "mand"/"men" false positives).
      keywords: [
        "til ham",
        "gave til ham",
        "herre",
        "herrer",
        "herretøj",
        "herretoj",
        "herrebeklædning",
        "male",
        "gentleman",
      ],
    },
  },
  {
    slug: "til-hende",
    id: "hende",
    label: "hende",
    phrase: "til hende",
    match: {
      keywords: [
        "til hende",
        "gave til hende",
        "dame",
        "damer",
        "dametøj",
        "dametoj",
        "damebeklædning",
        "kvinder",
        "female",
        "women",
      ],
    },
  },
  {
    slug: "til-par",
    id: "par",
    label: "par",
    phrase: "til parret",
    match: {
      keywords: ["par", "couple", "to personer", "fælles", "faelles", "bryllup"],
    },
  },
  {
    slug: "til-barn",
    id: "barn",
    label: "barn",
    phrase: "til børn",
    match: {
      keywords: [
        "barn",
        "børn",
        "born",
        "kids",
        "child",
        "baby",
        "legetøj",
        "legetoj",
        "junior",
      ],
    },
  },
  {
    slug: "til-teen",
    id: "teen",
    label: "teen",
    phrase: "til teens",
    match: {
      keywords: ["teen", "teenager", "ungdom", "ung", "youth", "konfirmation"],
    },
  },
  {
    slug: "til-kollega",
    id: "kollega",
    label: "kollega",
    phrase: "til kollegaen",
    match: {
      keywords: ["kollega", "kontor", "office", "desk", "arbejdsplads"],
    },
  },
];

export const INTERESTS: InterestDef[] = [
  {
    slug: "gameren",
    id: "gameren",
    label: "gameren",
    headlineHint: "der gamer",
    match: {
      keywords: [
        "gamer",
        "gaming",
        "playstation",
        "xbox",
        "nintendo",
        "headset",
        "controller",
        "brætspil",
        "braetspil",
        "boardgame",
        "computergame",
        "pc-spil",
        "pc spil",
      ],
    },
  },
  {
    slug: "madentusiasten",
    id: "madentusiasten",
    label: "madentusiasten",
    headlineHint: "der elsker mad",
    match: {
      keywords: [
        "køkken",
        "koekken",
        "chokolade",
        "kaffe",
        "vin",
        "gourmet",
        "kokketøj",
        "kokketoj",
        "food",
        "deli",
        "krydderi",
        "kogebog",
        "madlavning",
      ],
    },
  },
  {
    slug: "fitness",
    id: "fitness",
    label: "fitness",
    headlineHint: "der træner",
    match: {
      keywords: [
        "fitness",
        "træning",
        "traening",
        "sport",
        "yoga",
        "løb",
        "lob",
        "workout",
        "gym",
        "wellness",
      ],
    },
  },
  {
    slug: "skoenhed",
    id: "skoenhed",
    label: "skønhed",
    headlineHint: "der elsker skønhed",
    match: {
      keywords: [
        "skønhed",
        "skoenhed",
        "beauty",
        "parfume",
        "creme",
        "makeup",
        "hudpleje",
        "duft",
        "spa",
      ],
    },
  },
  {
    slug: "tech",
    id: "tech",
    label: "tech",
    headlineHint: "der er tech-nørd",
    match: {
      keywords: [
        "tech",
        "elektronik",
        "gadget",
        "usb",
        "hovedtelefon",
        "høretelefon",
        "horetelefon",
        "smartphone",
        "smartwatch",
        "powerbank",
      ],
    },
  },
  {
    slug: "laeseren",
    id: "laeseren",
    label: "læseren",
    headlineHint: "der elsker at læse",
    match: {
      // Avoid bare "guide" — it tagged random merchant copy onto læser-hubs.
      keywords: ["bog", "bøger", "boeger", "læse", "laese", "book", "roman", "krimi"],
    },
  },
  {
    slug: "bolig",
    id: "bolig",
    label: "boligentusiasten",
    headlineHint: "der elsker bolig",
    match: {
      keywords: [
        "bolig",
        "hjem",
        "keramik",
        "lys",
        "interior",
        "interiør",
        "interior",
        "hygge",
        "dekor",
        "plante",
      ],
    },
  },
  {
    slug: "outdoor",
    id: "outdoor",
    label: "outdoor-entusiasten",
    headlineHint: "der elsker outdoor",
    match: {
      keywords: [
        "outdoor",
        "camping",
        "vandring",
        "rygsæk",
        "rygsaek",
        "rejse",
        "natur",
        "friluft",
      ],
    },
  },
];

export const OCCASIONS: OccasionDef[] = [
  {
    slug: "fodselsdag",
    id: "fodselsdag",
    label: "fødselsdag",
    match: {
      keywords: ["fødselsdag", "fodselsdag", "birthday", "årsdag", "aarsdag"],
    },
  },
  {
    slug: "jul",
    id: "jul",
    label: "jul",
    match: {
      keywords: ["jul", "jule", "christmas", "advent", "gaveæske", "gaveaeske"],
    },
  },
  {
    slug: "bryllup",
    id: "bryllup",
    label: "bryllup",
    match: {
      keywords: ["bryllup", "wedding", "brudepar", "vielse"],
    },
  },
  {
    slug: "konfirmation",
    id: "konfirmation",
    label: "konfirmation",
    match: {
      keywords: ["konfirmation", "konfirmand"],
    },
  },
  {
    slug: "mors-dag",
    id: "mors-dag",
    label: "mors dag",
    match: {
      keywords: ["mors dag", "mother s day", "mothers day"],
    },
  },
  {
    slug: "fars-dag",
    id: "fars-dag",
    label: "fars dag",
    match: {
      keywords: ["fars dag", "father s day", "fathers day"],
    },
  },
  {
    slug: "hostegave",
    id: "hostegave",
    label: "hostegave",
    match: {
      keywords: ["hoste", "tak", "værtsgave", "vaertsgave", "hostess"],
    },
  },
];

export const BUDGETS: BudgetDef[] = [
  { slug: "under-100", id: "under-100", label: "under 100 kr", maxOre: 100_00 },
  { slug: "under-200", id: "under-200", label: "under 200 kr", maxOre: 200_00 },
  { slug: "under-500", id: "under-500", label: "under 500 kr", maxOre: 500_00 },
  { slug: "under-1000", id: "under-1000", label: "under 1.000 kr", maxOre: 1000_00 },
];

export type PathPattern =
  | "recipient"
  | "occasion"
  | "recipient-interest"
  | "occasion-budget";

export type LandingFilters = {
  recipientId?: string;
  interestId?: string;
  occasionId?: string;
  budgetMaxOre?: number;
  budgetId?: string;
};

export function recipientBySlug(slug: string): RecipientDef | undefined {
  return RECIPIENTS.find((r) => r.slug === slug);
}

export function recipientById(id: string): RecipientDef | undefined {
  return RECIPIENTS.find((r) => r.id === id);
}

export function interestBySlug(slug: string): InterestDef | undefined {
  return INTERESTS.find((i) => i.slug === slug);
}

export function interestById(id: string): InterestDef | undefined {
  return INTERESTS.find((i) => i.id === id);
}

export function occasionBySlug(slug: string): OccasionDef | undefined {
  return OCCASIONS.find((o) => o.slug === slug);
}

export function occasionById(id: string): OccasionDef | undefined {
  return OCCASIONS.find((o) => o.id === id);
}

export function budgetBySlug(slug: string): BudgetDef | undefined {
  return BUDGETS.find((b) => b.slug === slug);
}

export function budgetById(id: string): BudgetDef | undefined {
  return BUDGETS.find((b) => b.id === id);
}

export function recipientSeoTag(id: string): string {
  return seoTag("modtager", id);
}

export function interestSeoTag(id: string): string {
  return seoTag("interesse", id);
}

export function occasionSeoTag(id: string): string {
  return seoTag("anledning", id);
}

export function budgetSeoTag(id: string): string {
  return seoTag("budget", id);
}

/** All canonical landing slug combinations (before product-count filter). */
export function enumerateLandingSpecs(): Array<{
  slug: string;
  pathPattern: PathPattern;
  filters: LandingFilters;
  requiredTags: string[];
}> {
  const specs: Array<{
    slug: string;
    pathPattern: PathPattern;
    filters: LandingFilters;
    requiredTags: string[];
  }> = [];

  for (const r of RECIPIENTS) {
    specs.push({
      slug: r.slug,
      pathPattern: "recipient",
      filters: { recipientId: r.id },
      requiredTags: [recipientSeoTag(r.id)],
    });
    for (const i of INTERESTS) {
      specs.push({
        slug: `${r.slug}/${i.slug}`,
        pathPattern: "recipient-interest",
        filters: { recipientId: r.id, interestId: i.id },
        requiredTags: [recipientSeoTag(r.id), interestSeoTag(i.id)],
      });
    }
  }

  for (const o of OCCASIONS) {
    specs.push({
      slug: o.slug,
      pathPattern: "occasion",
      filters: { occasionId: o.id },
      requiredTags: [occasionSeoTag(o.id)],
    });
    for (const b of BUDGETS) {
      specs.push({
        slug: `${o.slug}/${b.slug}`,
        pathPattern: "occasion-budget",
        filters: {
          occasionId: o.id,
          budgetId: b.id,
          budgetMaxOre: b.maxOre,
        },
        requiredTags: [occasionSeoTag(o.id), budgetSeoTag(b.id)],
      });
    }
  }

  return specs;
}
