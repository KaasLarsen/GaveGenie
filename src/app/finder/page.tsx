import type { Metadata } from "next";
import { GiftFinderForm } from "@/components/GiftFinderForm";

export const metadata: Metadata = {
  title: "Gavefinder",
  description:
    "Beskriv gaven du leder efter, og få forslag fra GaveGenies produktkatalog.",
};

export default function FinderPage() {
  return (
    <section className="section">
      <h1 className="section__title">Gavefinder</h1>
      <p className="section__lead">
        Fortæl os hvem gaven er til, anledningen og dit budget. Vi foreslår kun
        produkter, der findes i kataloget — aldrig opdigtede varer.
      </p>
      <GiftFinderForm />
    </section>
  );
}
