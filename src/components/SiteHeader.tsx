"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { BrandWordmark } from "./BrandWordmark";

const NAV_LINKS = [
  { href: "/gaver", label: "Gaveidéer" },
  { href: "/gaver/til-ham", label: "Til ham" },
  { href: "/gaver/til-hende", label: "Til hende" },
  { href: "/gaver/jul", label: "Jul" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const headerClass = [
    "site-header",
    isHome ? "site-header--over-hero" : "site-header--solid",
    scrolled ? "site-header--scrolled" : "",
    menuOpen ? "site-header--menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={headerClass}>
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="GaveGenie forsiden">
          <BrandWordmark />
        </Link>

        <nav className="site-nav" aria-label="Hovedmenu">
          <ul className="site-nav__list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    isActive(link.href)
                      ? "site-nav__link site-nav__link--active"
                      : "site-nav__link"
                  }
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {isHome ? (
                <a className="site-nav__cta" href="#gave-soegning">
                  Find gave
                </a>
              ) : (
                <Link className="site-nav__cta" href="/#gave-soegning">
                  Find gave
                </Link>
              )}
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="site-header__menu-btn"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Luk menu" : "Åbn menu"}</span>
          <span aria-hidden className="site-header__menu-icon">
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>
      </div>

      <div
        id={menuId}
        className="site-nav-drawer"
        hidden={!menuOpen}
      >
        <nav aria-label="Mobilmenu">
          <ul className="site-nav-drawer__list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    isActive(link.href)
                      ? "site-nav-drawer__link site-nav-drawer__link--active"
                      : "site-nav-drawer__link"
                  }
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {isHome ? (
                <a className="site-nav-drawer__cta" href="#gave-soegning">
                  Find gave
                </a>
              ) : (
                <Link className="site-nav-drawer__cta" href="/#gave-soegning">
                  Find gave
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
