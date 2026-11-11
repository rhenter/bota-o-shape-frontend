import type { Metadata } from "next";
import { getMessages } from "@/i18n/server";
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
  const [{ plano }, { signup }] = await Promise.all([searchParams, getMessages()]);
  return (
    <section className="signup">
      <aside className="side">
        <h1>{signup.title}</h1>
        <p>{signup.lead}</p>
      </aside>
      <div className="main">
        <SignupForm planCode={plano === "pro" ? "pro" : undefined} />
        <p className="note">{signup.note}</p>
      </div>
    </section>
  );
}
