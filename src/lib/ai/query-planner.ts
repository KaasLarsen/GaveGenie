import OpenAI from "openai";
import { analyzeGiftIntent } from "../gift-intent";
import { giftSearchPlanSchema, type GiftSearchPlan } from "../schema";
import type { GiftPreferences } from "../types";
import { isOpenAiConfigured } from "./openai";

/** Small synonym expansions for common gift interests (heuristic fallback). */
const INTEREST_SYNONYMS: Record<string, string[]> = {
  vin: ["vin", "rødvin", "hvidvin", "vinæske", "vingave"],
  rodvin: ["rødvin", "vin"],
  rødvin: ["rødvin", "vin"],
  hvidvin: ["hvidvin", "vin"],
  kaffe: ["kaffe", "kaffekrus", "espresso"],
  te: ["te", "tekrus"],
  bog: ["bog", "bøger", "roman"],
  boger: ["bog", "bøger"],
  bøger: ["bog", "bøger"],
  parfume: ["parfume", "duft"],
  chokolade: ["chokolade", "kakao"],
  lys: ["lys", "duftlys"],
  plante: ["plante", "blomst"],
  planter: ["plante", "blomst"],
  padel: ["padel", "padelbat"],
  tennis: ["tennis", "ketsjer"],
  ski: ["ski", "skitøj"],
  outdoor: ["outdoor", "vandring"],
  plakat: ["plakat", "poster"],
  vinflaske: ["vin", "rødvin"],
};

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function uniqueQueries(queries: string[], max = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of queries) {
    const q = raw.trim().replace(/\s+/g, " ");
    if (q.length < 2) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q.slice(0, 80));
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Deterministic plan when OpenAI is missing or fails.
 * Mirrors vinbot: always return catalog-ready search strings.
 */
export function heuristicGiftSearchPlan(
  preferences: GiftPreferences,
): GiftSearchPlan {
  const intent = analyzeGiftIntent(preferences);
  const queries: string[] = [];

  for (const token of intent.interestTokens) {
    const syns = INTEREST_SYNONYMS[token] ?? [token];
    queries.push(...syns);
  }

  if (queries.length === 0 && preferences.style?.trim()) {
    queries.push(preferences.style.trim());
  }
  if (queries.length === 0) {
    // Last resort: raw query truncated (still better than empty)
    queries.push(preferences.query.slice(0, 80));
  }

  const avoidTerms: string[] = [];
  if (intent.recipientGender === "female") {
    avoidTerms.push("herre", "herrebukser", "herretøj", "mand", "mænd");
  } else if (intent.recipientGender === "male") {
    avoidTerms.push("dame", "damebukser", "dametøj", "kvinde", "pige");
  }

  return giftSearchPlanSchema.parse({
    searchQueries: uniqueQueries(queries, 3),
    avoidTerms,
    budgetMaxDkk:
      preferences.budgetMaxOre !== undefined
        ? preferences.budgetMaxOre / 100
        : null,
  });
}

/**
 * OpenAI (or heuristic) turns a natural gift description into short catalog
 * search queries — same pattern as vinbot wine-chat. Never invents products.
 */
export async function planGiftSearch(
  preferences: GiftPreferences,
): Promise<{ plan: GiftSearchPlan; source: "openai" | "fallback" }> {
  const fallback = heuristicGiftSearchPlan(preferences);

  if (!isOpenAiConfigured()) {
    return { plan: fallback, source: "fallback" };
  }

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const client = getClient();

    const system = `Du er GaveGenies danske gave-søgehjælper.
Brugeren beskriver en person/anledning. Du skal omsætte det til korte søgestrenge
der finder produkter i et dansk webshop-katalog (affiliate-feeds).

Svar KUN med JSON:
{"searchQueries":["..."],"avoidTerms":["..."],"budgetMaxDkk":null}

Regler:
- searchQueries: 1–3 korte danske strenge (2–5 ord) med KONKRETE produkt/interesse-ord
  (fx "rødvin gave", "vinglas", "kaffekrus keramik"). Ikke hele sætninger.
- Undgå filler: "gave til mor", "sød", "elsker", "på 65" — fokusér på hvad der skal købes.
- avoidTerms: ord der IKKE passer (fx "herre","herrebukser" hvis gaven er til en kvinde/mor).
- budgetMaxDkk: tal i kroner eller null.
- Opfind aldrig produktnavne, priser eller URL'er — kun søgeord.`;

    const user = JSON.stringify({
      query: preferences.query,
      recipient: preferences.recipient ?? null,
      occasion: preferences.occasion ?? null,
      style: preferences.style ?? null,
      budgetMinDkk:
        preferences.budgetMinOre !== undefined
          ? preferences.budgetMinOre / 100
          : null,
      budgetMaxDkk:
        preferences.budgetMaxOre !== undefined
          ? preferences.budgetMaxOre / 100
          : null,
    });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { plan: fallback, source: "fallback" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { plan: fallback, source: "fallback" };
    }

    const validated = giftSearchPlanSchema.safeParse(parsed);
    if (!validated.success) {
      return { plan: fallback, source: "fallback" };
    }

    const searchQueries = uniqueQueries(validated.data.searchQueries, 3);
    if (searchQueries.length === 0) {
      return { plan: fallback, source: "fallback" };
    }

    const avoidTerms = [
      ...new Set(
        [...validated.data.avoidTerms, ...fallback.avoidTerms]
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 1),
      ),
    ].slice(0, 12);

    return {
      plan: {
        searchQueries,
        avoidTerms,
        budgetMaxDkk:
          validated.data.budgetMaxDkk ?? fallback.budgetMaxDkk ?? null,
      },
      source: "openai",
    };
  } catch {
    return { plan: fallback, source: "fallback" };
  }
}
