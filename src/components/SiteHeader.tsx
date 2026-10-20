"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

const NAV_LINKS = [
  { href: "/finder", label: "Find gave" },
  { href: "/affiliate", label: "Affiliate" },
  { href: "/privatliv", label: "Privatliv" },
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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const headerClass = [
    "site-header",
    isHome ? "site-header--over-hero" : "site-header--solid",
    scrolled || menuOpen ? "site-header--scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClass}>
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="GaveGenie forsiden">
          GaveGenie
        </Link>

        <nav className="site-nav site-nav--desktop" aria-label="Primær">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="site-nav__toggle"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="site-nav__toggle-bar" aria-hidden />
          <span className="site-nav__toggle-bar" aria-hidden />
        </button>
      </div>

      <nav
        id={menuId}
        className={`site-nav site-nav--mobile${menuOpen ? " is-open" : ""}`}
        aria-label="Mobil"
        hidden={!menuOpen}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
