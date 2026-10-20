import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Om os",
  description:
    "Hvordan GaveGenie finder gaver med AI-matching, rigtige produktfeeds og affiliate-transparens.",
};

export default function AboutPage() {
  return (
    <section className="section section--narrow prose-page">
      <h1>Om GaveGenie</h1>
      <p>
        GaveGenie hjælper dig med at finde gaver, der rammer plet — uden endeløs
        scrolling. Du beskriver personen, anledningen eller stemningen, og vi
        foreslår produkter fra et rigtigt katalog.
      </p>

      <h2>Sådan virker det</h2>
      <p>
        Når du søger, matcher vi din fritekst (og eventuelle filtre) mod produkter
        i vores database. Forslagene kommer fra importerede produktfeeds — ikke
        opdigtede varer. Hvis AI er konfigureret, skriver vi danske begrundelser
        for, hvorfor hver gave kan passe; selve produkterne, priserne og
        lagerstatus kommer fra feedet.
      </p>

      <h2 id="affiliate">Affiliate-model</h2>
      <p>
        Nogle links på GaveGenie kan være affiliate-links. Køber du via et sådant
        link, kan vi modtage en kommission fra forhandleren — uden at det koster
        dig ekstra. Vi er åbne om det, fordi tillid er en del af oplevelsen.
      </p>
      <p>
        Mere detalje findes under{" "}
        <Link href="/affiliate">affiliate-oplysning</Link> og i vores{" "}
        <Link href="/vilkaar">vilkår</Link>.
      </p>

      <p>
        <Link href="/#gave-soegning">Tilbage til forsiden</Link>
      </p>
    </section>
  );
}
