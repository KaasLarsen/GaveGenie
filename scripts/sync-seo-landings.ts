/**
 * Recompute SeoLanding rows from Product.tags + taxonomy combinations.
 *
 * Usage:
 *   npm run pseo:sync-landings
 *
 * Requires DATABASE_URL. Run after feed import so SEO tags exist.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { syncSeoLandings } from "../src/lib/pseo/landings";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("Syncing SeoLanding rows from taxonomy + product tags…");
  const result = await syncSeoLandings();
  console.log(
    JSON.stringify(
      {
        upserted: result.upserted,
        indexed: result.indexed,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
