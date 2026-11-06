import type { Plan } from "@/lib/api";

export type FaqItem = { question: string; answer: string };

export function marketingFaqItems(pro?: Plan): FaqItem[] {
  const publishedFeatures = pro?.features.filter(Boolean).slice(0, 4) ?? [];
  const included = publishedFeatures.length
    ? `O plano Pro atende até 500 alunos ativos e inclui ${publishedFeatures.join(", ")}.`
    : "O plano Pro atende até 500 alunos ativos. Os recursos publicados pela plataforma aparecem na página de planos.";

  return [
    { question: "O que está incluso no plano Pro?", answer: included },
    {
      question: "Posso alterar meu plano depois?",
      answer: "As condições vigentes e as opções disponíveis para a sua academia são apresentadas no painel antes de qualquer alteração.",
    },
    {
      question: "O app do aluno está incluso?",
      answer: "O aluno usa o aplicativo para acompanhar treinos, evolução, avaliações e orientações liberadas pela equipe. Consulte a página de planos para confirmar as condições comerciais vigentes.",
    },
    {
      question: "Como é feito o suporte?",
      answer: "Os canais de atendimento disponíveis para a academia são informados no painel. Assim, nenhum canal ou prazo é prometido antes de estar configurado.",
    },
  ];
}

export function MarketingFaq({ items }: { items: FaqItem[] }) {
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
      <h2 id="faq-title">Dúvidas frequentes</h2>
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
