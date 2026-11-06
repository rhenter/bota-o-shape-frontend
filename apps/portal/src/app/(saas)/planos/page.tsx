import type { Metadata } from "next";
import Link from "next/link";
import { fetchPlans, PRO_PLAN } from "@/lib/api";

export const metadata: Metadata = {
  title: "Planos",
  description: "Consulte os planos e recursos publicados pelo Bota o Shape!.",
  alternates: { canonical: "/planos" },
  openGraph: { url: "/planos", title: "Planos · Bota o Shape!" },
  twitter: { card: "summary", title: "Planos · Bota o Shape!", description: "Planos e recursos publicados pela plataforma." },
};
export const revalidate = 300;

export default async function PlansPage() {
  const plans = await fetchPlans();
  const pro = plans?.find((plan) => plan.code === PRO_PLAN.code);
  return (
    <main className="plans-page">
      <section className="plans-content">
        <div className="wrap plans-layout">
          <div className="plans-intro">
            <span className="eyebrow">Planos</span>
            <h1>Escolha o plano ideal para a sua academia</h1>
            <p>Valores e recursos publicados pela plataforma, sem comparações ou promessas artificiais.</p>
            <ul><li>Até 500 alunos ativos no Pro</li><li>Recursos atualizados pela API</li><li>Contratação integrada ao cadastro</li></ul>
          </div>
          <div className="plans-result" aria-live="polite">
          {plans === null ? (
            <p role="alert" className="error">Não foi possível carregar os planos agora. Tente novamente em instantes.</p>
          ) : !pro ? (
            <p className="card">O plano Pro não está publicado no momento.</p>
          ) : (
            <article className="plan-pro-card">
              <span className="plan-badge">Plano aprovado</span>
              <h2>{pro.name}</h2>
              <p>Para academias que querem mais controle e engajamento.</p>
              <strong className="price">R$ 99,00<small>/mês</small></strong>
              <p className="limit">Até {PRO_PLAN.students} alunos ativos</p>
              <ul>{pro.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <Link href="/cadastro?plano=pro" className="btn">Começar com o Pro</Link>
            </article>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
