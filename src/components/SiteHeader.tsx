import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="GaveGenie forsiden">
          GaveGenie
        </Link>
        <nav className="site-nav" aria-label="Primær">
          <Link href="/finder">Find gave</Link>
          <Link href="/affiliate">Affiliate</Link>
          <Link href="/privatliv">Privatliv</Link>
        </nav>
      </div>
    </header>
  );
}
