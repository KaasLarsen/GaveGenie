import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Affiliate-oplysning",
  description:
    "Sådan fungerer affiliate-links på GaveGenie — gennemsigtighed om kommission.",
};

export default function AffiliatePage() {
  return (
    <section className="section section--narrow prose-page">
      <h1>Affiliate-oplysning</h1>
      <p>
        GaveGenie kan indeholde affiliate-links. Når du køber via et sådant
        link, kan vi modtage en kommission fra forhandleren — uden at det koster
        dig ekstra.
      </p>
      <p>
        Vi opfinder aldrig produkter, priser eller lagerstatus. Forslag kommer
        fra et importeret katalog. I udviklingsmiljøet kan produkter være
        markeret som <strong>Eksempel · DEV</strong> — det er fiktive
        testdata, ikke live tilbud.
      </p>
      <p>
        Når rigtige affiliate-feeds tilkobles, vil rettigheder, tracking og
        disclosure følge partnernes vilkår. Indtil da kan sample-URL&apos;er
        pege mod placeholder-domæner.
      </p>
      <p>
        Se også <Link href="/om-os">om os</Link> og{" "}
        <Link href="/vilkaar">vilkår</Link>.
      </p>
      <p>
        <Link href="/#gave-soegning">Tilbage til forsiden</Link>
      </p>
    </section>
  );
}
