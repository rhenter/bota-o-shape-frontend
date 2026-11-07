import { fill } from "@/i18n/locale";
import type { Messages } from "@/i18n/pt-BR";
import { ptBR } from "@/i18n/pt-BR";
import type { Plan } from "@/lib/api";

export type FaqItem = { question: string; answer: string };

export function marketingFaqItems(pro?: Plan, messages: Messages = ptBR): FaqItem[] {
  const publishedFeatures = pro?.features?.filter(Boolean).slice(0, 4) ?? [];
  const included = publishedFeatures.length
    ? fill(messages.faq.proWithFeatures, { features: publishedFeatures.join(", ") })
    : messages.faq.proFallback;

  return [
    { question: messages.faq.includedQuestion, answer: included },
    { question: messages.faq.changeQuestion, answer: messages.faq.changeAnswer },
    { question: messages.faq.appQuestion, answer: messages.faq.appAnswer },
    { question: messages.faq.supportQuestion, answer: messages.faq.supportAnswer },
  ];
}

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
