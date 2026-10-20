"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = [
    "site-header",
    isHome ? "site-header--over-hero" : "site-header--solid",
    scrolled ? "site-header--scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClass}>
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="GaveGenie forsiden">
          GaveGenie
        </Link>
        {isHome ? (
          <a className="site-header__skip" href="#gave-soegning">
            Til søgning
          </a>
        ) : (
          <Link className="site-header__skip" href="/#gave-soegning">
            Find gave
          </Link>
        )}
      </div>
    </header>
  );
}
