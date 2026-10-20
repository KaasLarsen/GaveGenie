import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__brand">GaveGenie</p>
        <p className="site-footer__note">
          Gaveforslag baseret på et produktkatalog. Links kan være affiliate-links.
        </p>
        <div className="site-footer__links">
          <Link href="/affiliate">Affiliate-oplysning</Link>
          <Link href="/privatliv">Privatliv</Link>
        </div>
      </div>
    </footer>
  );
}
