import { SEO_YEAR } from "./constants";
import type { LandingCopy, LandingStats } from "./content-blueprints";
import { formatPriceDkk } from "../format";

export type HubEditorialPack = LandingCopy & {
  tips: { title: string; items: string[] };
  productsHeading: string;
};

const HUB_SLUGS = new Set(["til-ham", "til-hende", "jul"]);

export function isHubEditorialSlug(slug: string): boolean {
  return HUB_SLUGS.has(slug);
}

function priceFrom(stats: LandingStats): string {
  if (stats.minPriceOre == null) return "ukendt pris";
  return formatPriceDkk(stats.minPriceOre);
}

function tilHam(stats: LandingStats): HubEditorialPack {
  const min = priceFrom(stats);
  const cats =
    stats.topCategories.length > 0
      ? stats.topCategories.slice(0, 3).join(", ")
      : "tech, outdoor og mad";

  return {
    h1: `Gaver til ham — idéer der rammer (${SEO_YEAR})`,
    metaTitle: `Gaver til ham ${SEO_YEAR} | GaveGenie`,
    metaDescription: `Find den rigtige gave til ham blandt ${stats.productCount} konkrete forslag fra ca. ${min}. Fokus på brugbare hits — ikke tilfældigt fyld.`,
    intro: [
      `At købe gave til ham er sjældent svært, fordi der mangler ting — det er svært, fordi generiske “sikkert hits” føles anonyme. En god gave til ham løser noget i hverdagen, opgraderer en vane eller giver en oplevelse, han selv havde udsat.`,
      `Start med det, han allerede bruger tid på: kaffe, grill, gaming, løb, værktøj, vin eller tech. Derefter vælger du kvalitet frem for volumen. Listen her er filtreret til ${stats.productCount} aktuelle produkter (fra ca. ${min}) med vægt på ${cats}.`,
      `Undgå at gå efter det dyreste i kataloget. Det, der rammer, er ofte det konkrete: bedre høretelefoner til pendling, en flaske han faktisk åbner, eller kit til hobbyen — ikke endnu en trøje uden historie.`,
    ],
    tips: {
      title: "Sådan vælger du gave til ham",
      items: [
        "Spørg dig selv: hvad bruger han mindst tre gange om ugen?",
        "Vælg opgradering (bedre version) frem for helt ny kategori, hvis du er usikker.",
        "Tjek lager og leveringstid, hvis gaven skal frem til en fast dato.",
        "Kombinér gerne en praktisk hovedgave med noget lille, der føles personligt.",
      ],
    },
    productsHeading: "Gaveidéer til ham",
    faq: [
      {
        question: "Hvad er en sikker gave til ham, hvis jeg ikke kender hobbyerne?",
        answer:
          "Gå efter forbrugsgaver med klar brugsoplevelse: god kaffe, vin, pleje med enkel duft, eller tech-tilbehør han mangler (powerbank, kabel, høretelefoner). Undgå tøj i størrelser, medmindre du kender dem.",
      },
      {
        question: "Skal gaven til ham være dyr for at virke gennemtænkt?",
        answer: `Nej. I vores liste starter priserne omkring ${min}. Et præcist valg til 200–500 kr slår ofte et dyrt, generisk køb. Match relationen og anledningen først — budgettet bagefter.`,
      },
      {
        question: "Hvordan undgår jeg gaver, der ender i skuffen?",
        answer:
          "Vælg noget med umiddelbar brug: det, der erstatter et slidt produkt, eller som gør en vane lettere. Dekoration alene er risikabelt, medmindre du kender stilen hjemme hos ham.",
      },
    ],
  };
}

function tilHende(stats: LandingStats): HubEditorialPack {
  const min = priceFrom(stats);
  const cats =
    stats.topCategories.length > 0
      ? stats.topCategories.slice(0, 3).join(", ")
      : "skønhed, bolig og smykker";

  return {
    h1: `Gaver til hende — gennemtænkte idéer (${SEO_YEAR})`,
    metaTitle: `Gaver til hende ${SEO_YEAR} | GaveGenie`,
    metaDescription: `Gennemtænkte gaveidéer til hende: ${stats.productCount} forslag fra ca. ${min}. Personligt, brugbart og uden generisk fyld.`,
    intro: [
      `En god gave til hende føles valgt — ikke hentet fra en tilfældig “til hende”-hylde. Det betyder, at du matcher hendes stil, hverdag og det, hun allerede spejder efter, i stedet for at gætte dig frem til endnu en generisk duftlyse.`,
      `Tænk i tre spor: noget til kroppen (pleje, duft, smykker), noget til hjemmet (keramik, tekstiler, lys med karakter), eller noget til en konkret hobby. Vi har samlet ${stats.productCount} aktuelle forslag fra ca. ${min}, typisk inden for ${cats}.`,
      `Hvis du er i tvivl mellem to ting, så vælg den med klarest brugsoplevelse. En creme hun løber tør for, et smykke i hendes stil, eller et kit til køkkenet hun allerede elsker, slår næsten altid “fin men anonym” pynt.`,
    ],
    tips: {
      title: "Sådan vælger du gave til hende",
      items: [
        "Notér farver, materialer og mærker hun allerede bruger — og bliv i den retning.",
        "Spørg indirekte: hvad er hun løbet tør for, eller hvad har hun wishlistet?",
        "Ved skønhed: vælg anerkendte duftfamilier eller neutrale basisprodukter, hvis du er usikker.",
        "Pakningen tæller — men indholdet skal kunne stå alene, når papiret er væk.",
      ],
    },
    productsHeading: "Gaveidéer til hende",
    faq: [
      {
        question: "Hvad giver man hende, når man ikke må spørge direkte?",
        answer:
          "Kig i hverdagen: tom shampoo, yndlingskaffe, smykker hun matcher ofte, eller bøger/serier hun følger. Vælg en opgradering af noget eksisterende frem for et vildt sidespring.",
      },
      {
        question: "Er skønhedsprodukter altid et sikkert valg til hende?",
        answer: `Kun hvis du kender duft/hudtype — ellers er det let at ramme forkert. Gode sikre spor er basispleje, læbepomade i god kvalitet eller en gave hun selv kan bytte. Priserne i listen starter omkring ${min}.`,
      },
      {
        question: "Hvordan finder jeg noget personligt uden at det bliver for intimt?",
        answer:
          "Vælg noget til en fælles kontekst (middag, rejse, hjem) eller til en hobby hun taler om offentligt. Undgå størrelsesfølsomt tøj og meget personlig lingeri, medmindre relationen er helt klar.",
      },
    ],
  };
}

function jul(stats: LandingStats): HubEditorialPack {
  const min = priceFrom(stats);
  const cats =
    stats.topCategories.length > 0
      ? stats.topCategories.slice(0, 3).join(", ")
      : "mad, vin og hygge";

  return {
    h1: `Julegaver ${SEO_YEAR} — idéer der føles som jul`,
    metaTitle: `Julegaver ${SEO_YEAR} | GaveGenie`,
    metaDescription: `${stats.productCount} julegaveidéer fra ca. ${min}. Fra små hostegaver til de gaver, der faktisk bliver åbnet med glæde.`,
    intro: [
      `Julen er den anledning, hvor “det går nok” ikke er godt nok. En julegave skal kunne tåle at ligge under træet: enten fordi den er personlig, fordi den er lækker at åbne, eller fordi den løser noget praktisk midt i travlheden.`,
      `Tænk i lag: én hovedgave, der matcher personen, og evt. noget lille til stemningen — chokolade, lys, vin eller en hostegave til dem, der inviterer. Her får du ${stats.productCount} aktuelle forslag fra ca. ${min}, ofte inden for ${cats}.`,
      `Køb i god tid, hvis levering er kritisk, og hold øje med lagerstatus. En stærk julegave er den, der ankommer — ikke den, der bliver i backorder til januar.`,
    ],
    tips: {
      title: "Sådan nagle julegaven",
      items: [
        "Skriv en kort liste pr. person: hobby, “løbet tør for”, og et budgetloft.",
        "Prioritér gaver med klar åbneoplevelse (sæt, æske med indhold, noget man prøver med det samme).",
        "Til værten: vælg noget, der kan bruges samme aften — vin, chokolade, lys.",
        "Tjek leveringsfrist hos forhandleren, før du lover gaven under træet.",
      ],
    },
    productsHeading: "Julegaveidéer",
    faq: [
      {
        question: "Hvornår skal man købe julegaver for at nå leveringen?",
        answer:
          "Det afhænger af forhandleren, men populære varer kan være væk i december. Vælg tidligt, hvis gaven er specifik — og hav en reserveidé, hvis lagerstatus skifter.",
      },
      {
        question: "Hvad er en god julegave, når budgettet er stramt?",
        answer: `Gå efter noget koncentreret: én god flaske, fin chokolade, et lille skønhedsprodukt eller noget til kaffen. I denne liste starter priserne omkring ${min}. Personlighed slår størrelse.`,
      },
      {
        question: "Skal julegaver matche et tema, eller bare personen?",
        answer:
          "Personen først. Juletema (advent, kalender, hygge) er bonus, ikke krav. En gave, der matcher hverdagen året rundt, er næsten altid stærkere end ren julepynt.",
      },
    ],
  };
}

/** Hand-written Danish copy for the three header hub landings. */
export function getHubEditorial(
  slug: string,
  stats: LandingStats,
): HubEditorialPack | null {
  if (slug === "til-ham") return tilHam(stats);
  if (slug === "til-hende") return tilHende(stats);
  if (slug === "jul") return jul(stats);
  return null;
}
