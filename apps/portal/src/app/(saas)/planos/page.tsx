import type { Metadata } from "next";
import Link from "next/link";
import { fill } from "@/i18n/locale";
import { getMessages } from "@/i18n/server";
import { fetchPlans, PRO_PLAN } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.plansTitle,
    description: meta.plansDescription,
    alternates: { canonical: "/planos" },
    openGraph: { url: "/planos", title: meta.plansOgTitle },
    twitter: { card: "summary", title: meta.plansOgTitle, description: meta.plansTwitterDescription },
  };
}
export const revalidate = 300;

export default async function PlansPage() {
  const [plans, messages] = await Promise.all([fetchPlans(), getMessages()]);
  const copy = messages.plans;
  const pro = plans?.find((plan) => plan.code === PRO_PLAN.code);
  return (
    <main className="plans-page">
      <section className="plans-content">
        <div className="wrap plans-layout">
          <div className="plans-intro">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.lead}</p>
            <ul>{copy.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </div>
          <div className="plans-result" aria-live="polite">
          {plans === null ? (
            <p role="alert" className="error">{copy.unavailable}</p>
          ) : !pro ? (
            <p className="card">{copy.unpublished}</p>
          ) : (
            <article className="plan-pro-card">
              <span className="plan-badge">{copy.badge}</span>
              <h2>{pro.name}</h2>
              <p>{copy.description}</p>
              <strong className="price">{copy.price}<small>{copy.perMonth}</small></strong>
              <p className="limit">{fill(copy.limit, { students: PRO_PLAN.students })}</p>
              <ul>{(pro.features ?? []).map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <Link href="/cadastro?plano=pro" className="btn">{copy.start}</Link>
            </article>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
