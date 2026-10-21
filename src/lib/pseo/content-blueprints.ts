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
  /** Two or more intro paragraphs */
  intro: string[];
  tips?: { title: string; items: string[] };
  productsHeading?: string;
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

function catsPhrase(stats: LandingStats): string {
  return stats.topCategories.length > 0
    ? stats.topCategories.slice(0, 3).join(", ")
    : "populære kategorier";
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

/** Interest-specific “what to look for” lines. */
function interestAdvice(interestId: string | undefined): string {
  switch (interestId) {
    case "gameren":
      return "Til gameren: prioriter komfort (headset), ergonomi (mus/controller) eller noget, der opgraderer setup’et — ikke tilfældig merchandise.";
    case "madentusiasten":
      return "Til madentusiasten: vælg ingredienser og værktøj med klar smags- eller brugsoplevelse — vin, krydderi, kaffe eller kokketøj, der faktisk kommer i brug.";
    case "fitness":
      return "Til den træningsglade: praktisk gear, der overlever sved og hverdag, slår dekorative fitness-gadgets.";
    case "skoenhed":
      return "Til skønhedselskere: gå efter duftfamilier og basispleje, du kender — eller noget neutralt, der er nemt at bytte.";
    case "tech":
      return "Til tech-nørden: kabler, powerbanks og audio, der løser et konkret problem, rammer oftere end “endnu en dings”.";
    case "laeseren":
      return "Til læseren: vælg genrer, de allerede læser, eller noget til læserummet (lys, bogstøtte) frem for en tilfældig bestseller.";
    case "bolig":
      return "Til boligentusiasten: materialer og farver, der matcher hjemmet, er vigtigere end trendsnapshots.";
    case "outdoor":
      return "Til outdoor-typen: holdbart, pakbart og vejregnet gear vinder over souvenirs.";
    default:
      return "Kig efter gaver med klar brugsoplevelse — noget, der bruges ofte, eller som løfter en vane.";
  }
}

function occasionAdvice(occasionId: string | undefined): string {
  switch (occasionId) {
    case "jul":
      return "Til jul: vælg noget, der tåler at ligge under træet — personligt, lækkert at åbne, eller praktisk midt i travlheden.";
    case "fodselsdag":
      return "Til fødselsdag: gå efter det, personen selv ville have købt, bare lidt finere.";
    case "bryllup":
      return "Til bryllup: fælles oplevelser og ting til hjemmet rammer oftere end meget personlige solo-gaver.";
    case "konfirmation":
      return "Til konfirmation: vælg noget, den unge faktisk bruger — tech, oplevelse eller et bidrag med en personlig note.";
    case "mors-dag":
      return "Til mors dag: prioriter det, hun ellers sparer på til sig selv — pleje, blomsteroplevelse eller pause i hverdagen.";
    case "fars-dag":
      return "Til fars dag: opgrader en vane (kaffe, grill, værktøj, outdoor) frem for endnu en joke-gave.";
    case "hostegave":
      return "Som hostegave: vælg noget, værten kan åbne samme aften — vin, chokolade eller fine snacks.";
    default:
      return "Match anledningen først, og vælg derefter noget konkret fra kataloget.";
  }
}

function recipientAdvice(recipientId: string | undefined): string {
  switch (recipientId) {
    case "ham":
      return "Til ham: opgrader noget, han allerede bruger, i stedet for at gætte en helt ny stil.";
    case "hende":
      return "Til hende: stil og hverdagsvaner slår generiske “til hende”-hylder.";
    case "par":
      return "Til parret: vælg noget, I kan bruge sammen — mad, oplevelse eller hjem.";
    case "barn":
      return "Til børn: alder, sikkerhed og det, barnet leger med nu, er vigtigere end trends.";
    case "teen":
      return "Til teens: spørg ind til musik, gaming, sport eller æstetik — undgå “barnlige” gaver.";
    case "kollega":
      return "Til kollegaen: hold det professionelt og nemt at dele — snacks, kaffe eller desk-venlige ting.";
    default:
      return "Tænk i vaner og relation, før du kigger på pris.";
  }
}

function introPoolA(resolved: ResolvedSlug, stats: LandingStats): string[] {
  const core = personaCore(resolved);
  const min = pricePhrase(stats.minPriceOre);
  const cats = catsPhrase(stats);
  const advice =
    resolved.pathPattern === "recipient-interest"
      ? interestAdvice(resolved.filters.interestId)
      : resolved.pathPattern.startsWith("occasion")
        ? occasionAdvice(resolved.filters.occasionId)
        : recipientAdvice(resolved.filters.recipientId);

  return [
    `At finde den rigtige gave ${core} handler om at matche personens hverdag — ikke bare at købe det dyreste. Vi har samlet ${stats.productCount} konkrete forslag, hvor priserne starter omkring ${min}. ${advice}`,
    `Når du shopper gaver ${core}, er det smart at starte med vaner og hobbies frem for generiske “sikkert hits”. Her får du ${stats.productCount} udvalgte produkter med fokus på ${cats}, fra ca. ${min}. ${advice}`,
    `En god gave ${core} føles personlig uden at kræve timer i butikker. Listen rummer ${stats.productCount} aktuelle idéer — typisk inden for ${cats} — med priser fra ${min}. ${advice}`,
    `Gaver ${core} bliver stærkere, når du vælger noget brugbart eller stemningsfyldt frem for tilfældigt fyld. Vi har filtreret ${stats.productCount} produkter (fra ${min}) med vægt på ${cats}. ${advice}`,
  ];
}

function introPoolB(resolved: ResolvedSlug, stats: LandingStats): string[] {
  const max = pricePhrase(stats.maxPriceOre);
  const occasionHint =
    resolved.labels.occasion != null
      ? ` til ${resolved.labels.occasion}`
      : "";
  const budgetHint =
    resolved.labels.budget != null
      ? ` Hold dig inden for ${resolved.labels.budget}, hvis budgettet er stramt.`
      : ` Du kan finde både overkommelige og mere luksuriøse valg (op til ca. ${max}).`;
  const lookFor =
    resolved.filters.interestId != null
      ? interestAdvice(resolved.filters.interestId)
      : resolved.filters.occasionId != null
        ? occasionAdvice(resolved.filters.occasionId)
        : recipientAdvice(resolved.filters.recipientId);

  return [
    `Brug listen som et kort shortcut: tjek billede, pris og forhandler, og vælg det der matcher relationen${occasionHint}.${budgetHint} ${lookFor}`,
    `Tip: prioriter gaver, der løser et lille problem eller opgraderer en vane${occasionHint}. Sammenlign priser op til ca. ${max}.${budgetHint} ${lookFor}`,
    `Start med 2–3 favoritter, og vælg derefter ud fra leveringstid og lagerstatus${occasionHint}.${budgetHint} GaveGenie viser kun produkter fra det synkroniserede katalog.`,
    `Hvis du er i tvivl, vælg noget med klar brugsoplevelse frem for dekoration alene${occasionHint}.${budgetHint} ${lookFor}`,
  ];
}

function lookForSection(resolved: ResolvedSlug): {
  title: string;
  items: string[];
} {
  const interestId = resolved.filters.interestId;
  const occasionId = resolved.filters.occasionId;
  const recipientId = resolved.filters.recipientId;

  if (interestId) {
    return {
      title: "Hvad du skal kigge efter",
      items: [
        interestAdvice(interestId),
        "Sammenlign lagerstatus og levering, før du beslutter dig.",
        "Vælg forhandleren, du stoler på — alle links går direkte til butikken.",
      ],
    };
  }
  if (occasionId) {
    return {
      title: "Hvad du skal kigge efter",
      items: [
        occasionAdvice(occasionId),
        recipientAdvice(recipientId),
        "Hold øje med budgetloftet, hvis du shopper til flere personer.",
      ].filter(Boolean),
    };
  }
  return {
    title: "Hvad du skal kigge efter",
    items: [
      recipientAdvice(recipientId),
      "Match relationen først, prisen bagefter.",
      "Undgå generisk fyld — vælg noget med klar brug.",
    ],
  };
}

function faqFor(resolved: ResolvedSlug, stats: LandingStats) {
  const core = personaCore(resolved);
  const min = pricePhrase(stats.minPriceOre);
  const interestId = resolved.filters.interestId;
  const occasionId = resolved.filters.occasionId;

  const q1Interest = interestId
    ? [
        {
          question: `Hvad er en god gave ${core}?`,
          answer: `${interestAdvice(interestId)} Se vores ${stats.productCount} forslag og vælg ud fra stil og pris.`,
        },
        {
          question: `Hvordan undgår jeg at ramme forkert ${core}?`,
          answer: `Hold dig tæt på hobbyen, og vælg opgraderinger frem for helt nye kategorier. Vi har ${stats.productCount} filtrerede produkter, så du kan sammenligne hurtigt.`,
        },
      ]
    : [
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

  const q3Occasion = occasionId
    ? [
        {
          question: `Hvornår skal man købe gave til ${resolved.labels.occasion}?`,
          answer: `${occasionAdvice(occasionId)} Tjek lager og levering hos forhandleren, især hvis datoen er fast.`,
        },
        {
          question: `Skal gaven til ${resolved.labels.occasion} være tematisk?`,
          answer:
            "Personen først, tema bagefter. En gave, der matcher hverdagen, slår næsten altid ren anledningspynt.",
        },
      ]
    : [
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
    pick(q1Interest, resolved.slug, "faq1"),
    pick(q2, resolved.slug, "faq2"),
    pick(q3Occasion, resolved.slug, "faq3"),
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

function productsHeadingFor(resolved: ResolvedSlug): string {
  const core = personaCore(resolved);
  if (resolved.pathPattern.startsWith("occasion")) {
    return `Gaveidéer til ${resolved.labels.occasion}`;
  }
  return `Gaveidéer ${core}`;
}

/** Deterministic Danish landing copy with per-slug variant selection. */
export function buildLandingCopy(
  resolved: ResolvedSlug,
  stats: LandingStats,
): LandingCopy {
  const introA = pick(introPoolA(resolved, stats), resolved.slug, "introA");
  const introB = pick(introPoolB(resolved, stats), resolved.slug, "introB");
  const tips = lookForSection(resolved);

  return {
    h1: buildH1(resolved, stats),
    intro: [introA, introB],
    tips,
    productsHeading: productsHeadingFor(resolved),
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
