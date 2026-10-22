import OpenAI from "openai";
import { openaiWhyResponseSchema } from "../schema";
import type { GiftPreferences, RankedCandidate } from "../types";
import { preferenceWhy } from "../why";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export type WhyMap = Map<string, string>;

/**
 * Ask OpenAI for short Danish "hvorfor" explanations for real candidate IDs only.
 * Never invent products — only IDs present in `candidates` are accepted.
 * Never copy or paraphrase merchant/feed prose into user-facing whys.
 */
export async function generateDanishWhys(
  preferences: GiftPreferences,
  candidates: RankedCandidate[],
): Promise<WhyMap> {
  const allowedIds = new Set(candidates.map((c) => c.id));
  if (candidates.length === 0) return new Map();

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const client = getClient();

  const catalog = candidates.map((c) => ({
    productId: c.id,
    title: c.title,
    brand: c.brand,
    category: c.category,
    tags: c.tags,
    priceOre: c.priceOre,
    retailerName: c.retailerName,
    isSample: c.isSample,
  }));

  const system = `Du er GaveGenies gavehjælper. Du skriver korte, venlige danske begrundelser ("hvorfor") for gaveforslag.
Regler:
- Brug KUN productId'er fra den givne kandidatliste. Opfind aldrig produkter, priser eller URL'er.
- Skriv 1-2 sætninger på dansk per produkt.
- Vær konkret ift. brugerens ønsker (modtager, anledning, stil, budget).
- Skriv ORIGINALE match-begrundelser ud fra brugerens ønsker. Kopier eller omskriv ALDRIG katalog-, forhandler- eller feed-tekst (titler, beskrivelser, tags).
- Opfind ikke produktfakta (materialer, farver, detaljer) der ikke er nødvendige for at forklare match.
- Hvis et produkt er isSample=true, må du gerne nævne at det er et eksempelprodukt.
- Svar KUN med JSON: {"recommendations":[{"productId":"...","why":"..."}]}`;

  const user = JSON.stringify({
    preferences: {
      query: preferences.query,
      recipient: preferences.recipient || null,
      occasion: preferences.occasion || null,
      style: preferences.style || null,
      budgetMinOre: preferences.budgetMinOre ?? null,
      budgetMaxOre: preferences.budgetMaxOre ?? null,
    },
    candidates: catalog,
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return fallbackWhys(candidates, preferences);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return fallbackWhys(candidates, preferences);
  }

  const validated = openaiWhyResponseSchema.safeParse(parsed);
  if (!validated.success) {
    return fallbackWhys(candidates, preferences);
  }

  const map: WhyMap = new Map();
  for (const item of validated.data.recommendations) {
    if (!allowedIds.has(item.productId)) continue; // drop invented IDs
    map.set(item.productId, item.why.trim());
  }

  // Ensure every returned candidate has a why (fallback for missing)
  for (const c of candidates) {
    if (!map.has(c.id)) {
      map.set(c.id, preferenceWhy(preferences, c.isSample));
    }
  }

  return map;
}

function fallbackWhys(
  candidates: RankedCandidate[],
  preferences: GiftPreferences,
): WhyMap {
  const map: WhyMap = new Map();
  for (const c of candidates) {
    map.set(c.id, preferenceWhy(preferences, c.isSample));
  }
  return map;
}

/** Thin check used by health/docs — does not call the network. */
export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
