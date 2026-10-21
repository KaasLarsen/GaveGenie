import type { MetadataRoute } from "next";
import { listIndexedLandings } from "@/lib/pseo/landings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const staticPaths = [
    "",
    "/gaver",
    "/om-os",
    "/privatliv",
    "/vilkaar",
    "/affiliate",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/gaver" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/gaver" ? 0.9 : 0.7,
  }));

  let landingEntries: MetadataRoute.Sitemap = [];
  try {
    const landings = await listIndexedLandings();
    landingEntries = landings.map((landing) => ({
      url: `${siteUrl}/gaver/${landing.slug}`,
      lastModified: landing.lastSyncedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    landingEntries = [];
  }

  return [...staticEntries, ...landingEntries];
}
