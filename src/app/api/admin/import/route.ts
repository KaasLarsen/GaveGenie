import { NextResponse } from "next/server";
import { SampleFeedAdapter } from "@/lib/feeds/sample-adapter";
import { importFeed } from "@/lib/feeds/import";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * POST /api/admin/import
 * Authorization: Bearer <ADMIN_SECRET>
 * Body (optional): { "provider": "sample-dev" }
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return unauthorized();
  }

  let provider = "sample-dev";
  try {
    const body = (await request.json()) as { provider?: string };
    if (body?.provider) provider = body.provider;
  } catch {
    // empty body is fine
  }

  if (provider !== "sample-dev") {
    return NextResponse.json(
      {
        error:
          "Only sample-dev provider is available in MVP. Real affiliate feeds come later.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await importFeed(new SampleFeedAdapter());
    return NextResponse.json({
      ok: true,
      ...result,
      notice:
        "Imported development sample products only. Not live affiliate data.",
    });
  } catch (error) {
    console.error("admin import failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}
