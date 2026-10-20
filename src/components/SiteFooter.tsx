import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__brand">GaveGenie</p>
        <p className="site-footer__note">
          Gaveforslag matchet med AI — med tydelig affiliate-oplysning.
        </p>
        <nav className="site-footer__links" aria-label="Sidefod">
          <Link href="/om-os">Om os</Link>
          <Link href="/privatliv">Privatliv</Link>
          <Link href="/vilkaar">Vilkår</Link>
        </nav>
      </div>
    </footer>
  );
}
