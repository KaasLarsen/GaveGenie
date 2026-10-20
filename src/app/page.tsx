import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-label="GaveGenie">
        <div className="hero__media" aria-hidden>
          <div className="hero__image" />
          <div className="hero__veil" />
        </div>

        <div className="hero__content">
          <p className="hero__brand">GaveGenie</p>
          <h1 className="hero__headline">Find gaven, der rammer plet.</h1>
          <p className="hero__lead">
            Fortæl os lidt om personen, så finder vi gaver, der passer til deres
            interesser, din anledning og dit budget.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" href="/finder">
              Start gavefinder
            </Link>
            <Link className="btn btn--text" href="/affiliate">
              Om affiliate-links
            </Link>
          </div>
        </div>
      </section>

      <section className="quiet-band" aria-labelledby="quiet-band-title">
        <div className="quiet-band__inner">
          <h2 id="quiet-band-title" className="quiet-band__title">
            Personlige forslag — uden gætteri.
          </h2>
          <p className="quiet-band__lead">
            Vi matcher dig med produkter fra kataloget og forklarer på dansk,
            hvorfor hver gave kan ramme plet.
          </p>
        </div>
      </section>
    </>
  );
}
