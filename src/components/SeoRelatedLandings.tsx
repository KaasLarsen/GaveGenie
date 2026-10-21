import Link from "next/link";

type Related = { slug: string; label: string; href: string };

type Props = {
  items: Related[];
};

export function SeoRelatedLandings({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      className="seo-related"
      aria-labelledby="seo-related-heading"
    >
      <h2 id="seo-related-heading">Relaterede gaveidéer</h2>
      <ul className="seo-related__list">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
