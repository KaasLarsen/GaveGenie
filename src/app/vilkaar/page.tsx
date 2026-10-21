import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vilkår",
  description:
    "Brugsvilkår for GaveGenie — gaveforslag, produktkatalog og affiliate-links.",
};

export default function TermsPage() {
  return (
    <section className="section section--narrow prose-page">
      <h1>Vilkår</h1>
      <p>
        Disse vilkår gælder for brugen af GaveGenie (MVP). Ved at bruge
        tjenesten accepterer du nedenstående.
      </p>

      <h2>Tjenesten</h2>
      <p>
        GaveGenie er et gaveforslag-værktøj. Du indtaster ønsker og præferencer;
        vi returnerer forslag baseret på et produktkatalog fra samarbejdende
        forhandlere. Vi garanterer ikke, at et forslag er tilgængeligt, korrekt
        prissat eller egnet i alle situationer — tjek altid hos forhandleren før
        køb.
      </p>

      <h2>AI og data</h2>
      <p>
        Matching og danske begrundelser kan bruge AI. Vi opfinder ikke produkter:
        anbefalede varer skal findes i kataloget. Tekst, du indtaster, behandles
        for at levere søgeresultater — se også{" "}
        <Link href="/privatliv">privatliv</Link>.
      </p>

      <h2>Affiliate-links</h2>
      <p>
        Links til forhandlere kan være affiliate-links. Ved køb via sådanne links
        kan GaveGenie modtage kommission uden ekstra omkostning for dig. Læs mere
        under <Link href="/affiliate">affiliate-oplysning</Link>.
      </p>

      <h2>Ansvar</h2>
      <p>
        Tjenesten leveres &quot;som den er&quot; i MVP-fasen. Vi bestræber os på
        korrekte data, men fejl i kataloget, midlertidig utilgængelighed eller
        tekniske udfald kan forekomme.
      </p>

      <p>
        <Link href="/">Tilbage til forsiden</Link>
      </p>
    </section>
  );
}
