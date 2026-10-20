import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privatliv",
  description:
    "Hvordan GaveGenie behandler oplysninger, du indtaster i gavefinderen.",
};

export default function PrivacyPage() {
  return (
    <section className="section section--narrow prose-page">
      <h1>Privatliv</h1>
      <p>
        GaveGenie behandler de oplysninger, du indtaster i gavefinderen (fx fri
        tekst, anledning og budget), for at matche dig med produkter i kataloget.
        Teksten sendes til vores server og — hvis konfigureret — til OpenAI for
        at generere danske begrundelser.
      </p>
      <p>
        Vi opretter ikke en brugerkonto i MVP. Serverlogs kan midlertidigt
        indeholde tekniske fejloplysninger. Produktkataloget ligger i en
        database, der hostes som en del af tjenesten.
      </p>
      <p>
        Vi sælger ikke dine indtastninger. Affiliate-klik følger forhandlernes
        egne trackingvilkår, når du forlader GaveGenie — se{" "}
        <Link href="/om-os#affiliate">om affiliate</Link> og{" "}
        <Link href="/vilkaar">vilkår</Link>.
      </p>
      <p>
        Denne side er en kort MVP-politik. En fuld dansk privatlivspolitik med
        kontaktoplysninger og eventuelle cookiedetaljer bør udfyldes inden bred
        lancering.
      </p>
      <p>
        <Link href="/">Tilbage til forsiden</Link>
      </p>
    </section>
  );
}
