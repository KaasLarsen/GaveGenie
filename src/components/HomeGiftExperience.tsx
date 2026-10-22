"use client";

import { FormEvent, useEffect, useId, useRef, useState, startTransition } from "react";
import { BrandWordmark } from "./BrandWordmark";
import { GenieWorking } from "./GenieWorking";
import { ProductCard } from "./ProductCard";
import type { GiftRecommendation } from "@/lib/types";

type FindResponse = {
  recommendations?: GiftRecommendation[];
  usedAi?: boolean;
  sampleNotice?: string;
  error?: string;
};

export function HomeGiftExperience() {
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
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const filtersId = useId();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash === "#gave-soegning") {
        document.getElementById("gave-soegning")?.scrollIntoView({ block: "center" });
      }
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setResults([]);
    setMeta(null);

    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

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
    <>
      <section className="hero" aria-label="GaveGenie">
        <div className="hero__media" aria-hidden>
          <div className="hero__image" />
          <div className="hero__veil" />
        </div>

        <div className="hero__content">
          <BrandWordmark as="p" className="hero__brand" />
          <h1 className="hero__headline">Find gaven, der rammer plet.</h1>
          <p className="hero__lead">
            Fortæl os lidt om personen, så finder vi gaver, der passer til deres
            interesser, din anledning og dit budget.
          </p>

          <form
            id="gave-soegning"
            className="hero-search"
            onSubmit={onSubmit}
            aria-label="Gavefinder"
          >
            <label className="hero-search__label" htmlFor="hero-query">
              Beskriv gaven eller personen
            </label>
            <div className="hero-search__row">
              <textarea
                id="hero-query"
                ref={inputRef}
                className="hero-search__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Fx noget hyggeligt til min søster, der elsker planter…"
                rows={2}
                required
                minLength={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                className="btn btn--primary hero-search__submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Genie leder…" : "Find gaver"}
              </button>
            </div>

            <details className="hero-search__filters">
              <summary>Flere filtre (valgfrit)</summary>
              <div className="hero-search__filters-body" id={filtersId}>
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
              </div>
            </details>
          </form>
        </div>
      </section>

      {(hasSearched || loading) && (
        <section
          className="results-band"
          ref={resultsRef}
          id="gaveresultater"
          tabIndex={-1}
          aria-live="polite"
          aria-busy={loading}
          aria-labelledby="results-band-title"
        >
          <div className="results-band__inner">
            <h2 id="results-band-title" className="results-band__title">
              {loading ? "Genie leder efter gaver…" : "Dine gaveforslag"}
            </h2>

            {loading && <GenieWorking />}

            {error && (
              <p className="finder-error" role="alert">
                {error}
              </p>
            )}

            {!loading && meta && results.length > 0 && (
              <div className="finder-meta">
                {meta.sampleNotice && (
                  <p className="finder-meta__sample">{meta.sampleNotice}</p>
                )}
                <p className="finder-meta__ai">
                  {meta.usedAi
                    ? "Begrundelser er skrevet med AI ud fra kataloget."
                    : "Begrundelser er genereret uden AI (manglende nøgle eller fejl)."}
                </p>
              </div>
            )}

            {hasSearched && meta && results.length === 0 && !error && !loading && (
              <p className="finder-empty">
                Vi fandt desværre ingen gode match lige nu. Prøv at beskrive
                interessen lidt anderledes — fx “rødvin”, “kaffe” eller “plakat”.
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="product-grid">
                {results.map((product) => (
                  <ProductCard key={product.productId} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
