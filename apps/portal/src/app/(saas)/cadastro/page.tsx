import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/server";
import { fetchPlans } from "@/lib/api";
import { portugueseSocial } from "@/lib/social-metadata";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.signupTitle,
    alternates: { canonical: "/cadastro" },
    ...portugueseSocial("signup"),
  };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const [{ plano }, { signup }, plans] = await Promise.all([searchParams, getMessages(), fetchPlans()]);
  const selected = plans?.find((plan) => plan.code === plano);
  if (!selected) redirect("/planos");
  return (
    <section className="signup">
      <div className="signup-layout">
        <aside className="side">
          <h1>{signup.title}</h1>
          <p>{signup.lead}</p>
          <ol className="signup-steps">
            <li>
              <span>1</span>
              <div>
                <strong>{signup.stepPlan}</strong>
                <p>{selected.name}</p>
                <Link href="/planos">{signup.changePlan}</Link>
              </div>
            </li>
            <li aria-current="step">
              <span>2</span>
              <strong>{signup.stepAccount}</strong>
            </li>
          </ol>
          <p className="note">{signup.note}</p>
        </aside>
        <div className="main">
          <SignupForm planCode={selected.code} planName={selected.name} />
        </div>
      </div>
    </section>
  );
}
