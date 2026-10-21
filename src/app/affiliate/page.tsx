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
        GaveGenie kan indeholde affiliate-links via Partner Ads. Når du køber
        via et sådant link, kan vi modtage en kommission fra forhandleren —
        uden at det koster dig ekstra.
      </p>
      <p>
        Vi opfinder aldrig produkter, priser eller lagerstatus. Forslag kommer
        fra vores produktkatalog hos samarbejdende forhandlere. Produktlinks går
        via Partner Ads&apos; tracking, så køb kan spores korrekt hos partnerne.
      </p>
      <p>
        I udviklingsmiljøet kan enkelte produkter stadig være markeret som{" "}
        <strong>Eksempel · DEV</strong> — det er fiktive testdata. Når live
        kataloget er importeret, prioriterer gavefinderen rigtige affiliate-
        produkter.
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
