"use client";

import { FormEvent, useState, startTransition } from "react";
import { ProductCard } from "./ProductCard";
import type { GiftRecommendation } from "@/lib/types";

type FindResponse = {
  recommendations?: GiftRecommendation[];
  usedAi?: boolean;
  candidateCount?: number;
  sampleNotice?: string;
  error?: string;
};

/** Standalone panel form (e.g. /finder redirect fallback). Homepage uses HomeGiftExperience. */
export function GiftFinderForm() {
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [budgetMinDkk, setBudgetMinDkk] = useState("");
  const [budgetMaxDkk, setBudgetMaxDkk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GiftRecommendation[]>([]);
  const [meta, setMeta] = useState<{
    usedAi?: boolean;
    sampleNotice?: string;
  } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          recipient: recipient || undefined,
          occasion: occasion || undefined,
          style: style || undefined,
          budgetMinDkk: budgetMinDkk ? Number(budgetMinDkk) : undefined,
          budgetMaxDkk: budgetMaxDkk ? Number(budgetMaxDkk) : undefined,
        }),
      });
      const data = (await res.json()) as FindResponse;
      if (!res.ok) {
        throw new Error(data.error || "Noget gik galt");
      }
      startTransition(() => {
        setResults(data.recommendations ?? []);
        setMeta({
          usedAi: data.usedAi,
          sampleNotice: data.sampleNotice,
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt");
      setResults([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="finder">
      <form className="finder-form" onSubmit={onSubmit}>
        <label className="field field--primary">
          <span>Hvad leder du efter?</span>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fx noget hyggeligt til min søster, der elsker planter…"
            rows={3}
            required
            minLength={2}
          />
        </label>

        <div className="field-grid">
          <label className="field">
            <span>Til hvem? (valgfrit)</span>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Mor, kollega, partner…"
            />
          </label>
          <label className="field">
            <span>Anledning (valgfrit)</span>
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Fødselsdag, jul, tak…"
            />
          </label>
          <label className="field">
            <span>Stil (valgfrit)</span>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Minimalistisk, hyggelig, praktisk…"
            />
          </label>
          <label className="field">
            <span>Budget fra (DKK)</span>
            <input
              type="number"
              min={0}
              value={budgetMinDkk}
              onChange={(e) => setBudgetMinDkk(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field">
            <span>Budget til (DKK)</span>
            <input
              type="number"
              min={0}
              value={budgetMaxDkk}
              onChange={(e) => setBudgetMaxDkk(e.target.value)}
              placeholder="500"
            />
          </label>
        </div>

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Finder gaver…" : "Find gaven"}
        </button>
      </form>

      {error && (
        <p className="finder-error" role="alert">
          {error}
        </p>
      )}

      {meta && results.length > 0 && (
        <div className="finder-meta">
          {meta.sampleNotice && (
            <p className="finder-meta__sample">{meta.sampleNotice}</p>
          )}
          <p className="finder-meta__ai">
            {meta.usedAi
              ? "Begrundelser er skrevet med AI ud fra dine ønsker — ikke katalogtekst."
              : "Begrundelser er genereret uden AI (manglende nøgle eller fejl)."}
          </p>
        </div>
      )}

      {meta && results.length === 0 && !error && (
        <p className="finder-empty">
          Vi fandt desværre ingen gode match lige nu. Prøv at beskrive
          interessen lidt anderledes — fx “rødvin”, “kaffe” eller “plakat”.
        </p>
      )}

      <div className="product-grid">
        {results.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </div>
  );
}
