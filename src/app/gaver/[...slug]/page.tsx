import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";
import { SeoFaq } from "@/components/SeoFaq";
import { SeoProductCard } from "@/components/SeoProductCard";
import { SeoRelatedLandings } from "@/components/SeoRelatedLandings";
import { buildLandingCopy } from "@/lib/pseo/content-blueprints";
import { SEO_MIN_PRODUCTS } from "@/lib/pseo/constants";
import {
  aggregateLandingStats,
  fetchLandingProducts,
  findRelatedLandings,
  getIndexedLanding,
  listIndexedLandings,
} from "@/lib/pseo/landings";
import { resolveSlug } from "@/lib/pseo/slug";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  try {
    const landings = await listIndexedLandings();
    return landings.map((l) => ({
      slug: l.slug.split("/"),
    }));
  } catch {
    // DB unavailable at build time — ISR will fill in
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: segments } = await params;
  const resolved = resolveSlug(segments);
  if (!resolved) {
    return { title: "Side ikke fundet", robots: { index: false, follow: false } };
  }

  const landing = await getIndexedLanding(resolved.slug);
  const stats = landing
    ? {
        productCount: landing.productCount,
        minPriceOre: landing.minPriceOre,
        maxPriceOre: landing.maxPriceOre,
        topCategories: [] as string[],
      }
    : await aggregateLandingStats(resolved.filters);

  const indexed =
    (landing?.indexed ?? false) || stats.productCount >= SEO_MIN_PRODUCTS;
  const copy = buildLandingCopy(resolved, stats);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const canonical = `${siteUrl}/gaver/${resolved.slug}`;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical },
    robots: indexed
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: canonical,
      locale: "da_DK",
      type: "website",
    },
  };
}

export default async function GaverLandingPage({ params }: PageProps) {
  const { slug: segments } = await params;
  const resolved = resolveSlug(segments);
  if (!resolved) notFound();

  const landing = await getIndexedLanding(resolved.slug);
  const stats = await aggregateLandingStats(resolved.filters);
  const indexed =
    (landing?.indexed ?? false) || stats.productCount >= SEO_MIN_PRODUCTS;

  if (!indexed || stats.productCount < SEO_MIN_PRODUCTS) {
    notFound();
  }

  const [products, related] = await Promise.all([
    fetchLandingProducts(resolved.filters, 24),
    findRelatedLandings(resolved, 6),
  ]);

  const copy = buildLandingCopy(resolved, {
    ...stats,
    topCategories: stats.topCategories,
  });

  return (
    <article className="seo-landing section">
      <header className="seo-landing__header">
        <SeoBreadcrumbs crumbs={resolved.crumbs} />
        <h1>{copy.h1}</h1>
        <p className="seo-landing__lede">
          {stats.productCount} gaveidéer i kataloget
          {stats.minPriceOre != null
            ? ` · fra ${(stats.minPriceOre / 100).toLocaleString("da-DK")} kr`
            : ""}
        </p>
      </header>

      <section className="seo-landing__intro" aria-label="Introduktion">
        <p>{copy.intro[0]}</p>
        <p>{copy.intro[1]}</p>
      </section>

      <section
        className="seo-landing__products"
        aria-labelledby="seo-products-heading"
      >
        <h2 id="seo-products-heading">Udvalgte gaver</h2>
        <div className="product-grid">
          {products.map((product) => (
            <SeoProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <SeoFaq items={copy.faq} />
      <SeoRelatedLandings items={related} />
    </article>
  );
}
