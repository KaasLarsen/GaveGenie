/**
 * Import the development sample feed into Postgres.
 *
 * Usage:
 *   npm run import:feed
 *
 * Requires DATABASE_URL. Marks all products as isSample / DEV data.
 */
import "dotenv/config";
import { SampleFeedAdapter } from "../src/lib/feeds/sample-adapter";
import { importFeed } from "../src/lib/feeds/import";
import { prisma } from "../src/lib/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const adapter = new SampleFeedAdapter();
  console.log("Importing DEV sample feed (not live affiliate data)…");
  const result = await importFeed(adapter);
  console.log(
    JSON.stringify(
      {
        ...result,
        warning:
          "All imported products are development samples. Never invent live products.",
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
