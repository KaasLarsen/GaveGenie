import Link from "next/link";
import { BrandWordmark } from "./BrandWordmark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <BrandWordmark as="p" className="site-footer__brand" />
        <p className="site-footer__note">
          Gaveforslag matchet med AI.
        </p>
        <nav className="site-footer__links" aria-label="Sidefod">
          <Link href="/gaver">Gaveidéer</Link>
          <Link href="/gaver/til-ham">Til ham</Link>
          <Link href="/gaver/til-hende">Til hende</Link>
          <Link href="/gaver/jul">Jul</Link>
          <Link href="/om-os">Om os</Link>
          <Link href="/privatliv">Privatliv</Link>
          <Link href="/vilkaar">Vilkår</Link>
        </nav>
      </div>
    </footer>
  );
}
