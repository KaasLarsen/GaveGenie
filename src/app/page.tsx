import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero" aria-label="GaveGenie">
      <div className="hero__bg" aria-hidden />
      <div className="hero__content">
        <h1 className="hero__brand">GaveGenie</h1>
        <p className="hero__headline">Find gaven, der rammer plet.</p>
        <p className="hero__lead">
          Beskriv personen og anledningen — vi matcher dig med forslag fra
          kataloget, med klare begrundelser på dansk.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--primary" href="/finder">
            Start gavefinder
          </Link>
          <Link className="btn btn--ghost" href="/affiliate">
            Om affiliate-links
          </Link>
        </div>
      </div>
    </section>
  );
}
