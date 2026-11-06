import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingFaq, marketingFaqItems } from "@/components/marketing-faq";
import { fetchPlans, PRO_PLAN, SITE_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Gestão completa para academias",
  description: "Treinos, avaliações, nutrição, alunos e equipe em uma plataforma para academias.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "Bota o Shape! — Gestão completa para academias" },
  twitter: { card: "summary", title: "Bota o Shape! — Gestão completa para academias", description: "Gestão de treinos, avaliações, nutrição, alunos e equipe." },
};
export const revalidate = 300;

const modules = [
  ["◫", "Treinos", "Criação e personalização de treinos com exercícios e métodos."],
  ["✓", "Avaliações", "Avaliações físicas, medidas e evolução dos alunos."],
  ["●", "Nutrição", "Planos alimentares personalizados e orientações."],
  ["◎", "Equipe", "Gestão de professores, nutricionistas e permissões."],
  ["▥", "Relatórios", "Resultados, adesão, frequência e evolução da academia."],
];

const audiences = [
  ["♙", "Proprietário / Gestor", "Controle a operação, alunos, equipe e resultados."],
  ["◇", "Professor", "Criação de treinos, acompanhamento e avaliações."],
  ["●", "Nutricionista", "Planos alimentares, orientações e evolução dos alunos."],
];

const steps = [
  ["1", "Crie sua academia", "Cadastre os dados do seu negócio."],
  ["2", "Configure sua equipe", "Adicione professores e nutricionistas."],
  ["3", "Convide seus alunos", "Cadastre sua base de alunos."],
  ["4", "Comece a usar", "Crie treinos, avaliações e acompanhe os resultados."],
];

export default async function Home() {
  const plans = await fetchPlans();
  const pro = plans?.find((plan) => plan.code === PRO_PLAN.code);
  const faq = marketingFaqItems(pro);
  const planFeatures = pro?.features.filter(Boolean).slice(0, 4) ?? [];
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Organization", name: "Bota o Shape!", url: SITE_URL },
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Bota o Shape!", applicationCategory: "BusinessApplication", operatingSystem: "Web, Android e iOS", url: SITE_URL },
  ];

  return (
    <>
      {structuredData.map((data) => <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />)}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="wrap home-hero-grid">
          <div className="home-hero-copy">
            <span className="hero-badge">SaaS para academias</span>
            <h1 id="home-title">Gestão operacional completa da <em>sua academia</em></h1>
            <p>Treinos, avaliações, nutrição, alunos e equipe em um só lugar. Mais organização, engajamento e resultados para o seu negócio.</p>
            <div className="actions">
              <Link href="/produto" className="btn">Conhecer o produto <span aria-hidden="true">→</span></Link>
              <Link href="/planos" className="btn outline">Ver planos</Link>
            </div>
          </div>
          <div className="hero-product-preview" aria-label="Prévia ilustrativa do dashboard e do aplicativo">
            <div className="preview-lime" />
            <div className="laptop-frame screen-crop crop-dashboard">
              <Image src="/screens/admin/01-login-dashboard-alunos-exercicios.png" alt="Dashboard da academia com dados demonstrativos" width={1536} height={1024} priority sizes="(max-width: 760px) 90vw, 54vw" />
            </div>
            <div className="phone-frame screen-crop crop-app-home">
              <Image src="/screens/app/01-app-fluxo-principal.png" alt="Tela inicial demonstrativa do aplicativo do aluno" width={1024} height={1536} priority sizes="(max-width: 760px) 28vw, 14vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-section modules-section" aria-labelledby="modules-title">
        <div className="wrap">
          <h2 id="modules-title">Tudo o que você precisa para gerir <em>sua academia</em></h2>
          <div className="module-grid">
            {modules.map(([icon, title, text]) => (
              <article key={title}><i aria-hidden="true">{icon}</i><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section audience-section" aria-labelledby="audience-title">
        <div className="wrap audience-grid">
          <div className="audience-copy"><h2 id="audience-title">Para quem é o <em>Bota o Shape!</em></h2><p>Uma solução completa para diferentes profissionais do universo fitness.</p></div>
          {audiences.map(([icon, title, text]) => (
            <article key={title}><i aria-hidden="true">{icon}</i><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="home-section product-preview-section">
        <div className="wrap media-split">
          <div className="product-shot screen-crop crop-dashboard"><Image src="/screens/admin/01-login-dashboard-alunos-exercicios.png" alt="Dashboard real do painel administrativo" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 50vw" /></div>
          <div className="section-copy"><span className="eyebrow dark">Conheça a plataforma</span><h2>Uma plataforma completa, intuitiva e poderosa</h2><p>Organize sua operação, acompanhe a evolução dos alunos e tome decisões com base em dados reais.</p><Link href="/produto" className="btn">Ver o produto <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="home-section app-preview-section">
        <div className="wrap media-split app-split">
          <div className="section-copy"><span className="eyebrow dark">App do aluno</span><h2>Mais engajamento na palma da mão</h2><p>O aluno acompanha treinos, evolução, planos alimentares e resultados em um app simples e intuitivo.</p></div>
          <div className="app-shot screen-crop crop-app-row"><Image src="/screens/app/01-app-fluxo-principal.png" alt="Telas reais do aplicativo do aluno" width={1024} height={1536} sizes="(max-width: 760px) 100vw, 48vw" /></div>
          <ul className="check-list"><li>Treino do dia</li><li>Acompanhamento da evolução</li><li>Planos alimentares</li><li>Histórico de treinos e avaliações</li></ul>
        </div>
      </section>

      <section className="home-section steps-section" aria-labelledby="steps-title">
        <div className="wrap steps-layout">
          <div><h2 id="steps-title">Como funciona</h2><p>Comece a usar em poucos passos e coloque sua academia em outro nível.</p></div>
          <ol>{steps.map(([number, title, text]) => <li key={number}><i>{number}</i><strong>{title}</strong><span>{text}</span></li>)}</ol>
        </div>
      </section>

      <section className="home-section commercial-section">
        <div className="wrap commercial-grid">
          <article className="home-plan-card">
            <div><span>Plano Pro</span><strong>R$ 99,00 <small>/mês</small></strong></div>
            <ul><li>Até 500 alunos ativos</li>{planFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <Link href="/cadastro?plano=pro" className="btn">Começar com o Pro</Link>
          </article>
          <MarketingFaq items={faq} />
        </div>
      </section>

      <section className="home-final-cta">
        <div className="wrap"><h2>Pronto para elevar a gestão da sua academia?</h2><div className="actions"><Link href="/cadastro" className="btn">Começar agora <span aria-hidden="true">→</span></Link><Link href="/produto" className="btn outline">Conhecer o produto</Link></div></div>
      </section>
    </>
  );
}
