import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privatliv",
  description: "Privatlivspolitik-stub for GaveGenie MVP.",
};

export default function PrivacyPage() {
  return (
    <section className="section section--narrow prose-page">
      <h1>Privatliv</h1>
      <p>
        GaveGenie MVP behandler de oplysninger, du indtaster i gavefinderen
        (fx fri tekst, anledning og budget), for at matche dig med produkter i
        kataloget. Teksten sendes til vores server og — hvis konfigureret — til
        OpenAI for at generere danske begrundelser.
      </p>
      <p>
        Vi gemmer ikke en brugerkonto i MVP. Serverlogs kan midlertidigt
        indeholde tekniske fejloplysninger. Produktkataloget ligger i en
        Postgres-database, som du selv hoster.
      </p>
      <p>
        Denne side er en stub til MVP. En fuld dansk privatlivspolitik bør
        udfyldes inden lancering med rigtig juridisk tekst, kontaktoplysninger
        og eventuelle cookiedetaljer.
      </p>
      <p>
        <Link href="/">Tilbage til forsiden</Link>
      </p>
    </section>
  );
}
