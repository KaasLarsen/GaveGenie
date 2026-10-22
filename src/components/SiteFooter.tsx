import Link from "next/link";
import { BrandWordmark } from "./BrandWordmark";

const FOOTER_GROUPS = [
  {
    title: "Gaveidéer",
    links: [
      { href: "/gaver", label: "Gaveidéer" },
      { href: "/gaver/til-ham", label: "Til ham" },
      { href: "/gaver/til-hende", label: "Til hende" },
      { href: "/gaver/jul", label: "Jul" },
    ],
  },
  {
    title: "Om GaveGenie",
    links: [
      { href: "/om-os", label: "Om os" },
      { href: "/affiliate", label: "Affiliate" },
    ],
  },
  {
    title: "Juridisk",
    links: [
      { href: "/privatliv", label: "Privatliv" },
      { href: "/vilkaar", label: "Vilkår" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <BrandWordmark as="p" className="site-footer__brand" />
        <p className="site-footer__note">Gaveforslag matchet med AI.</p>
        <div className="site-footer__groups">
          {FOOTER_GROUPS.map((group) => (
            <nav
              key={group.title}
              className="site-footer__group"
              aria-label={group.title}
            >
              <h2 className="site-footer__group-title">{group.title}</h2>
              <ul className="site-footer__group-links">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
