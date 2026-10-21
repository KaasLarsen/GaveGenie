import Link from "next/link";

export type Crumb = { label: string; href: string };

type Props = {
  crumbs: Crumb[];
};

export function SeoBreadcrumbs({ crumbs }: Props) {
  return (
    <nav className="seo-breadcrumbs" aria-label="Brødkrummer">
      <ol className="seo-breadcrumbs__list">
        <li>
          <Link href="/">Forside</Link>
        </li>
        <li>
          <Link href="/gaver">Gaver</Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href}>
            <Link href={crumb.href}>{crumb.label}</Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
