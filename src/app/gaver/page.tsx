import type { Metadata } from "next";
import Link from "next/link";
import { listIndexedLandings } from "@/lib/pseo/landings";
import { resolveSlug } from "@/lib/pseo/slug";
import { OCCASIONS, RECIPIENTS } from "@/lib/pseo/taxonomy";

export const metadata: Metadata = {
  title: "Gaveidéer efter person og anledning",
  description:
    "Udforsk GaveGenies programmatiske gaveguides — filtreret efter modtager, interesse, anledning og budget.",
};

export const revalidate = 300;

const PRIMARY_HUBS = [
  { href: "/gaver/til-ham", label: "Gaver til ham" },
  { href: "/gaver/til-hende", label: "Gaver til hende" },
  { href: "/gaver/jul", label: "Gaver til jul" },
  ...RECIPIENTS.filter(
    (r) => r.slug !== "til-ham" && r.slug !== "til-hende",
  ).map((r) => ({
    href: `/gaver/${r.slug}`,
    label: `Gaver ${r.phrase}`,
  })),
  ...OCCASIONS.filter((o) => o.slug !== "jul").map((o) => ({
    href: `/gaver/${o.slug}`,
    label: `Gaver til ${o.label.toLowerCase()}`,
  })),
] as const;

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

      <section className="seo-hub__group" aria-labelledby="seo-hub-primary">
        <h2 id="seo-hub-primary">Populære guides</h2>
        <ul className="seo-hub__list">
          {PRIMARY_HUBS.map((hub) => (
            <li key={hub.href}>
              <Link href={hub.href}>{hub.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      {landings.length === 0 ? (
        <p className="seo-hub__empty">
          Flere indexerede guides dukker op, når kataloget er synkroniseret.
          Brug{" "}
          <Link href="/#gave-soegning">gavefinderen</Link> imens — eller åbn en
          af guiderne ovenfor.
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
