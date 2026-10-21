import type { Metadata } from "next";
import Link from "next/link";
import { listIndexedLandings } from "@/lib/pseo/landings";
import { resolveSlug } from "@/lib/pseo/slug";

export const metadata: Metadata = {
  title: "Gaveidéer efter person og anledning",
  description:
    "Udforsk GaveGenies programmatiske gaveguides — filtreret efter modtager, interesse, anledning og budget.",
};

export const revalidate = 3600;

export default async function GaverHubPage() {
  let landings: Awaited<ReturnType<typeof listIndexedLandings>> = [];
  try {
    landings = await listIndexedLandings();
  } catch {
    landings = [];
  }

  const byPattern = new Map<string, typeof landings>();
  for (const landing of landings) {
    const list = byPattern.get(landing.pathPattern) ?? [];
    list.push(landing);
    byPattern.set(landing.pathPattern, list);
  }

  const sections: Array<{ key: string; title: string }> = [
    { key: "recipient-interest", title: "Efter person og interesse" },
    { key: "recipient", title: "Efter modtager" },
    { key: "occasion-budget", title: "Efter anledning og budget" },
    { key: "occasion", title: "Efter anledning" },
  ];

  return (
    <section className="section seo-hub">
      <header className="seo-hub__header">
        <h1>Gaveidéer</h1>
        <p>
          Vælg en guide nedenfor — hver side er bygget fra vores synkroniserede
          produktkatalog med råd, FAQ og konkrete forslag.
        </p>
      </header>

      {landings.length === 0 ? (
        <p className="seo-hub__empty">
          Ingen indexerede gaveguides endnu. Kør feed-import og{" "}
          <code>npm run pseo:sync-landings</code> for at generere landings.
        </p>
      ) : (
        sections.map((section) => {
          const items = byPattern.get(section.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={section.key} className="seo-hub__group">
              <h2>{section.title}</h2>
              <ul className="seo-hub__list">
                {items.map((landing) => {
                  const resolved = resolveSlug(landing.slug.split("/"));
                  const label =
                    resolved?.crumbs.map((c) => c.label).join(" · ") ??
                    landing.slug;
                  return (
                    <li key={landing.slug}>
                      <Link href={`/gaver/${landing.slug}`}>{label}</Link>
                      <span className="seo-hub__count">
                        {landing.productCount} gaver
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </section>
  );
}
