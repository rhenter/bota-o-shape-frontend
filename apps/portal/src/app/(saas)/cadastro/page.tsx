import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Criar conta",
  alternates: { canonical: "/cadastro" },
  openGraph: { url: "/cadastro", title: "Criar conta · Bota o Shape!" },
  twitter: { card: "summary", title: "Criar conta · Bota o Shape!", description: "Cadastre sua conta profissional no Bota o Shape!." },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  return (
    <section className="signup">
      <aside className="side">
        <h1>Crie sua conta profissional</h1>
        <p>Cadastre sua academia, atuação individual ou equipe para organizar treinos, avaliações e nutrição.</p>
      </aside>
      <div className="main">
        <SignupForm planCode={plano === "pro" ? "pro" : undefined} />
        <p className="note">O cadastro cria a conta responsável e a assinatura; depois direciona ao painel.</p>
      </div>
    </section>
  );
}
