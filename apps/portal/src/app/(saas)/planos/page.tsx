import type { Metadata } from "next";
import Link from "next/link";
import { fill } from "@/i18n/locale";
import { getMessages } from "@/i18n/server";
import { fetchPlans, type Plan } from "@/lib/api";
import { visiblePlanFeatures } from "@/lib/plan-features";
import { portugueseSocial } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.plansTitle,
    description: meta.plansDescription,
    alternates: { canonical: "/planos" },
    ...portugueseSocial("plans"),
  };
}
export const revalidate = 300;

export default async function PlansPage() {
  const [plans, messages] = await Promise.all([fetchPlans(), getMessages()]);
  const copy = messages.plans;
  const published = plans === null ? null : sortPlans(plans);
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
          {published === null ? (
            <p role="alert" className="error">{copy.unavailable}</p>
          ) : published.length === 0 ? (
            <p className="card">{copy.unpublished}</p>
          ) : published.map((plan) => {
            const students = activeStudents(plan);
            const description = copy.descriptions[plan.code as keyof typeof copy.descriptions] ?? copy.defaultDescription;
            const features = visiblePlanFeatures(plan, copy);
            return (
              <article className="plan-pro-card" key={plan.code}>
                {plan.code === "pro" ? <span className="plan-badge">{copy.badge}</span> : null}
                <h2>{plan.name}</h2>
                <p>{description}</p>
                <strong className="price">{plan.price_reference}</strong>
                <p className="limit">{students === null ? copy.unlimited : fill(copy.limit, { students })}</p>
                <ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <Link href={`/cadastro?plano=${encodeURIComponent(plan.code)}`} className="btn">{fill(copy.start, { name: plan.name })}</Link>
              </article>
            );
          })}
          </div>
        </div>
      </section>
    </main>
  );
}

const PLAN_ORDER = ["start", "pro", "enterprise"];

function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => rank(a.code) - rank(b.code) || a.name.localeCompare(b.name));
}

function rank(code: string): number {
  const index = PLAN_ORDER.indexOf(code);
  return index === -1 ? PLAN_ORDER.length : index;
}

function activeStudents(plan: Plan): number | null {
  const value = plan.limits.active_students;
  return typeof value === "number" ? value : null;
}
