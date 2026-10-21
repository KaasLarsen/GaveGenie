/**
 * Fast, best-effort SEO tag backfill + landing sync during Vercel build.
 * Never fails the build. Hard time budget so hung DB cannot leave production
 * stuck on an old deploy.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { retagProductsMissingSeoTags } from "../src/lib/pseo/retag";

const DEFAULT_BUDGET_MS = 45_000;

function budgetMs(): number {
  const raw = process.env.ENSURE_SEO_BUDGET_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_BUDGET_MS;
}

async function disconnectQuietly() {
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[ensure-seo-on-build] DATABASE_URL missing — skip.");
    return;
  }

  const budget = budgetMs();
  console.log(
    `[ensure-seo-on-build] retag + sync landings (budget ${Math.round(budget / 1000)}s)…`,
  );

  let finished = false;
  // Force rewrite so tightened ham/hende matchers replace poisoned tags.
  const work = retagProductsMissingSeoTags({
    batchSize: 75,
    maxProducts: 2_500,
    force: true,
  })
    .then((result) => {
      finished = true;
      console.log("[ensure-seo-on-build]", JSON.stringify(result));
    })
    .catch((err) => {
      finished = true;
      console.error(
        "[ensure-seo-on-build] retag failed (ignored):",
        err instanceof Error ? err.message : err,
      );
    });

  await Promise.race([
    work,
    new Promise<void>((resolve) => setTimeout(resolve, budget)),
  ]);

  if (!finished) {
    console.warn(
      "[ensure-seo-on-build] time budget hit — continuing build; cron will finish.",
    );
    await disconnectQuietly();
    // Force-exit so a slow Prisma query cannot block `next build`.
    process.exit(0);
  }
}

main()
  .catch((err) => {
    console.error(
      "[ensure-seo-on-build] unexpected error (ignored):",
      err instanceof Error ? err.message : err,
    );
  })
  .finally(async () => {
    await disconnectQuietly();
  });
