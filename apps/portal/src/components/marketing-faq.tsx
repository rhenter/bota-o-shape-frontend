import { ptBR } from "@/i18n/pt-BR";

export type FaqItem = { question: string; answer: string };

export function MarketingFaq({ items, title = ptBR.faq.title }: { items: FaqItem[]; title?: string }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="home-faq" id="faq" aria-labelledby="faq-title">
      <h2 id="faq-title">{title}</h2>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </section>
  );
}
