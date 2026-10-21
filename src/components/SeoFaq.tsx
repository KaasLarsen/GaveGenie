type FaqItem = { question: string; answer: string };

type Props = {
  items: FaqItem[];
};

export function SeoFaq({ items }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="seo-faq" aria-labelledby="seo-faq-heading">
      <h2 id="seo-faq-heading">Ofte stillede spørgsmål</h2>
      <div className="seo-faq__list">
        {items.map((item) => (
          <details key={item.question} className="seo-faq__item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
