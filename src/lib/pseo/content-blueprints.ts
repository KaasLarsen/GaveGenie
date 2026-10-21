import { createHash } from "node:crypto";
import { formatPriceDkk } from "../format";
import { SEO_YEAR } from "./constants";
import type { ResolvedSlug } from "./slug";

export type LandingStats = {
  productCount: number;
  minPriceOre: number | null;
  maxPriceOre: number | null;
  topCategories: string[];
};

export type LandingCopy = {
  h1: string;
  intro: [string, string];
  faq: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDescription: string;
};

function stableIndex(seed: string, modulo: number): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) % modulo;
}

function pick<T>(variants: T[], seed: string, salt: string): T {
  return variants[stableIndex(`${seed}:${salt}`, variants.length)]!;
}

function pricePhrase(ore: number | null): string {
  if (ore === null) return "ukendt pris";
  return formatPriceDkk(ore);
}

function personaCore(resolved: ResolvedSlug): string {
  const { labels, pathPattern } = resolved;
  if (pathPattern === "recipient-interest") {
    return `${labels.recipientPhrase} ${labels.interestHint}`;
  }
  if (pathPattern === "recipient") {
    return labels.recipientPhrase ?? "modtageren";
  }
  if (pathPattern === "occasion-budget") {
    return `${labels.occasion} ${labels.budget}`;
  }
  return labels.occasion ?? "anledningen";
}

function buildH1(resolved: ResolvedSlug, stats: LandingStats): string {
  const countLabel =
    stats.productCount >= 15
      ? "15+"
      : stats.productCount >= 10
        ? "10+"
        : `${Math.max(stats.productCount, 1)}`;
  const core = personaCore(resolved);

  if (
    resolved.pathPattern === "recipient" ||
    resolved.pathPattern === "recipient-interest"
  ) {
    return `De ${countLabel} bedste gaver ${core} (${SEO_YEAR})`;
  }
  if (resolved.pathPattern === "occasion-budget") {
    return `Gaver til ${resolved.labels.occasion} ${resolved.labels.budget} (${SEO_YEAR})`;
  }
  return `Gaveidéer til ${resolved.labels.occasion} (${SEO_YEAR})`;
}

function introVariantsA(resolved: ResolvedSlug, stats: LandingStats): string[] {
  const core = personaCore(resolved);
  const min = pricePhrase(stats.minPriceOre);
  const cats =
    stats.topCategories.length > 0
      ? stats.topCategories.slice(0, 3).join(", ")
      : "populære kategorier";

  return [
    `At finde den rigtige gave ${core} handler om at matche personens hverdag — ikke bare at købe det dyreste. Vi har samlet ${stats.productCount} konkrete forslag fra vores katalog, hvor priserne starter omkring ${min}.`,
    `Når du shopper gaver ${core}, er det smart at starte med vaner og hobbies frem for generiske “sikkert hits”. Her får du ${stats.productCount} udvalgte produkter med fokus på ${cats}, fra ca. ${min}.`,
    `En god gave ${core} føles personlig uden at kræve timer i butikker. Listen nedenfor rummer ${stats.productCount} aktuelle idéer i kataloget — typisk inden for ${cats} — med priser fra ${min}.`,
    `Gaver ${core} bliver stærkere, når du vælger noget brugbart eller stemningsfyldt frem for tilfældigt fyld. Vi har filtreret ${stats.productCount} produkter (fra ${min}) så du hurtigt kan sammenligne.`,
  ];
}

function introVariantsB(resolved: ResolvedSlug, stats: LandingStats): string[] {
  const max = pricePhrase(stats.maxPriceOre);
  const occasionHint =
    resolved.labels.occasion != null
      ? ` til ${resolved.labels.occasion}`
      : "";
  const budgetHint =
    resolved.labels.budget != null
      ? ` Hold dig inden for ${resolved.labels.budget}, hvis budgettet er stramt.`
      : ` Du kan finde både overkommelige og mere luksuriøse valg (op til ca. ${max}).`;

  return [
    `Brug listen som et kort shortcut: tjek billede, pris og forhandler, og vælg det der matcher relationen${occasionHint}.${budgetHint} Alle links går direkte til forhandleren.`,
    `Tip: prioriter gaver, der løser et lille problem eller opgraderer en vane${occasionHint}. Sammenlign priser op til ca. ${max}, og vælg den butik du stoler på.${budgetHint}`,
    `Start med 2–3 favoritter, og vælg derefter ud fra leveringstid og lagerstatus${occasionHint}.${budgetHint} GaveGenie viser kun produkter fra det synkroniserede katalog — aldrig opdigtede varer.`,
    `Hvis du er i tvivl, vælg noget med klar brugsoplevelse frem for dekoration alene${occasionHint}.${budgetHint} Scroll ned for FAQ om budget, timing og hvad der typisk rammer plet.`,
  ];
}

function faqFor(resolved: ResolvedSlug, stats: LandingStats) {
  const core = personaCore(resolved);
  const min = pricePhrase(stats.minPriceOre);

  const q1 = [
    {
      question: `Hvad er en god gave ${core}?`,
      answer: `En god gave ${core} matcher hverdagen: noget der bruges ofte, eller som løfter en hobby. Se vores ${stats.productCount} forslag og vælg ud fra stil og pris — ikke kun trend.`,
    },
    {
      question: `Hvordan vælger jeg gave ${core} uden at gætte forkert?`,
      answer: `Tænk i vaner (kaffe, tech, sport, bolig) og vælg noget konkret fra kataloget. Vi har ${stats.productCount} filtrerede produkter, så du kan sammenligne hurtigt.`,
    },
  ];

  const q2 = [
    {
      question: `Hvad koster gaver ${core} typisk?`,
      answer: `I denne liste starter priserne omkring ${min}. Filtrer efter dit budget, og husk at “bedst” sjældent er det dyreste — det er det mest passende.`,
    },
    {
      question: `Kan jeg finde billige gaver ${core}?`,
      answer: `Ja. Listen inkluderer prisniveau fra ca. ${min}. Kig efter praktiske small gifts, hvis budgettet er stramt, og spar de større køb til særlige anledninger.`,
    },
  ];

  const q3 = [
    {
      question: "Er produkterne på GaveGenie rigtige forhandler-varer?",
      answer:
        "Ja. Alle produkter kommer fra synkroniserede partnerfeeds. Vi opfinder aldrig varer, priser eller URL’er — og nogle links kan være affiliate-links.",
    },
    {
      question: "Hvordan køber jeg gaven?",
      answer:
        "Klik “Se hos forhandler” på produktkortet. Du handler hos den enkelte butik; GaveGenie er en gavefinder, ikke en webshop med eget lager.",
    },
  ];

  return [
    pick(q1, resolved.slug, "faq1"),
    pick(q2, resolved.slug, "faq2"),
    pick(q3, resolved.slug, "faq3"),
  ];
}

function buildMetaTitle(resolved: ResolvedSlug): string {
  const year = String(SEO_YEAR);
  let raw: string;
  if (resolved.pathPattern === "recipient-interest") {
    raw = `Gaver ${resolved.labels.recipientPhrase} ${resolved.labels.interest} ${year}`;
  } else if (resolved.pathPattern === "recipient") {
    raw = `Gaver ${resolved.labels.recipientPhrase} ${year}`;
  } else if (resolved.pathPattern === "occasion-budget") {
    raw = `${resolved.labels.occasion} gaver ${resolved.labels.budget}`;
  } else {
    raw = `Gaveidéer til ${resolved.labels.occasion} ${year}`;
  }
  // Max ~60 chars
  if (raw.length <= 60) return raw;
  const short = raw.slice(0, 57).trimEnd();
  return `${short}…`;
}

function buildMetaDescription(
  resolved: ResolvedSlug,
  stats: LandingStats,
): string {
  const core = personaCore(resolved);
  const min = pricePhrase(stats.minPriceOre);
  return `Leder du efter den perfekte gave ${core}? Se vores liste med ${stats.productCount} geniale gaveidéer fra ${min}. Opdateret ${SEO_YEAR}.`;
}

/** Deterministic Danish landing copy with per-slug variant selection. */
export function buildLandingCopy(
  resolved: ResolvedSlug,
  stats: LandingStats,
): LandingCopy {
  const introA = pick(introVariantsA(resolved, stats), resolved.slug, "introA");
  const introB = pick(introVariantsB(resolved, stats), resolved.slug, "introB");

  return {
    h1: buildH1(resolved, stats),
    intro: [introA, introB],
    faq: faqFor(resolved, stats),
    metaTitle: buildMetaTitle(resolved),
    metaDescription: buildMetaDescription(resolved, stats),
  };
}

/** Token Jaccard distance (0 = identical, 1 = no overlap). */
export function textUniquenessRatio(a: string, b: string): number {
  const tok = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2),
    );
  const A = tok(a);
  const B = tok(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter += 1;
  }
  const union = A.size + B.size - inter;
  const jaccard = union === 0 ? 1 : inter / union;
  return 1 - jaccard;
}
