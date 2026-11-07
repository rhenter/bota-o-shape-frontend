import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingFaq, marketingFaqItems } from "@/components/marketing-faq";
import { getMessages } from "@/i18n/server";
import { fetchPlans, PRO_PLAN, SITE_URL } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.homeTitle,
    description: meta.homeDescription,
    alternates: { canonical: "/" },
    openGraph: { url: "/", title: meta.homeOgTitle },
    twitter: { card: "summary", title: meta.homeOgTitle, description: meta.homeTwitterDescription },
  };
}
export const revalidate = 300;

export default async function Home() {
  const [plans, messages] = await Promise.all([fetchPlans(), getMessages()]);
  const home = messages.home;
  const pro = plans?.find((plan) => plan.code === PRO_PLAN.code);
  const faq = marketingFaqItems(pro, messages);
  const planFeatures = pro?.features?.filter(Boolean).slice(0, 4) ?? [];
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
            <span className="hero-badge">{home.badge}</span>
            <h1 id="home-title">{home.titleBefore}<em>{home.titleEm}</em></h1>
            <p>{home.lead}</p>
            <div className="actions">
              <Link href="/produto" className="btn">{home.knowProduct} <span aria-hidden="true">→</span></Link>
              <Link href="/planos" className="btn outline">{home.seePlans}</Link>
            </div>
          </div>
          <div className="hero-product-preview" aria-label={home.previewLabel}>
            <div className="preview-lime" />
            <div className="laptop-frame screen-crop crop-dashboard">
              <Image src="/screens/admin/01-login-dashboard-alunos-exercicios.png" alt={home.dashboardAlt} width={1536} height={1024} priority sizes="(max-width: 760px) 90vw, 54vw" />
            </div>
            <div className="phone-frame screen-crop crop-app-home">
              <Image src="/screens/app/01-app-fluxo-principal.png" alt={home.appHomeAlt} width={1024} height={1536} priority sizes="(max-width: 760px) 28vw, 14vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-section modules-section" aria-labelledby="modules-title">
        <div className="wrap">
          <h2 id="modules-title">{home.modulesTitleBefore}<em>{home.modulesTitleEm}</em></h2>
          <div className="module-grid">
            {home.modules.map(([icon, title, text]) => (
              <article key={title}><i aria-hidden="true">{icon}</i><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section audience-section" aria-labelledby="audience-title">
        <div className="wrap audience-grid">
          <div className="audience-copy"><h2 id="audience-title">{home.audienceTitleBefore}<em>{home.audienceTitleEm}</em>{home.audienceTitleAfter}</h2><p>{home.audienceLead}</p></div>
          {home.audiences.map(([icon, title, text]) => (
            <article key={title}><i aria-hidden="true">{icon}</i><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="home-section product-preview-section">
        <div className="wrap media-split">
          <div className="product-shot screen-crop crop-dashboard"><Image src="/screens/admin/01-login-dashboard-alunos-exercicios.png" alt={home.platformImageAlt} width={1536} height={1024} sizes="(max-width: 760px) 100vw, 50vw" /></div>
          <div className="section-copy"><span className="eyebrow dark">{home.platformEyebrow}</span><h2>{home.platformTitle}</h2><p>{home.platformText}</p><Link href="/produto" className="btn">{home.seeProduct} <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="home-section app-preview-section">
        <div className="wrap media-split app-split">
          <div className="section-copy"><span className="eyebrow dark">{home.appEyebrow}</span><h2>{home.appTitle}</h2><p>{home.appText}</p></div>
          <div className="app-shot screen-crop crop-app-row"><Image src="/screens/app/01-app-fluxo-principal.png" alt={home.appImageAlt} width={1024} height={1536} sizes="(max-width: 760px) 100vw, 48vw" /></div>
          <ul className="check-list">{home.appPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </div>
      </section>

      <section className="home-section steps-section" aria-labelledby="steps-title">
        <div className="wrap steps-layout">
          <div><h2 id="steps-title">{home.stepsTitle}</h2><p>{home.stepsLead}</p></div>
          <ol>{home.steps.map(([number, title, text]) => <li key={number}><i>{number}</i><strong>{title}</strong><span>{text}</span></li>)}</ol>
        </div>
      </section>

      <section className="home-section commercial-section">
        <div className="wrap commercial-grid">
          <article className="home-plan-card">
            <div><span>{home.planName}</span><strong>{home.planPrice}<small>{home.perMonth}</small></strong></div>
            <ul><li>{home.studentLimit}</li>{planFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <Link href="/cadastro?plano=pro" className="btn">{home.startPro}</Link>
          </article>
          <MarketingFaq items={faq} title={messages.faq.title} />
        </div>
      </section>

      <section className="home-final-cta">
        <div className="wrap"><h2>{home.finalTitle}</h2><div className="actions"><Link href="/cadastro" className="btn">{home.finalStart} <span aria-hidden="true">→</span></Link><Link href="/produto" className="btn outline">{home.knowProduct}</Link></div></div>
      </section>
    </>
  );
}
