import { NextResponse } from "next/server";
import { findGifts } from "@/lib/finder";
import { giftPreferencesSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig JSON i forespørgslen" },
      { status: 400 },
    );
  }

  const parsed = giftPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Ugyldige præferencer",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (
    parsed.data.budgetMinDkk !== undefined &&
    parsed.data.budgetMaxDkk !== undefined &&
    parsed.data.budgetMinDkk > parsed.data.budgetMaxDkk
  ) {
    return NextResponse.json(
      { error: "Minimumsbudget kan ikke være højere end maksimum" },
      { status: 400 },
    );
  }

  try {
    const result = await findGifts(parsed.data);
    return NextResponse.json({
      recommendations: result.recommendations,
      usedAi: result.usedAi,
      candidateCount: result.candidateCount,
      disclosure:
        "Nogle links kan være affiliate-links. GaveGenie kan modtage kommission uden ekstra omkostning for dig.",
      sampleNotice:
        "Produkter markeret som eksempel er udviklingsdata — ikke live lager.",
    });
  } catch (error) {
    console.error("findGifts failed", error);
    const message =
      error instanceof Error && error.message.includes("DATABASE_URL")
        ? "Database er ikke konfigureret"
        : "Kunne ikke finde gaver lige nu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
