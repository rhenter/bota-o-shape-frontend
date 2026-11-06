import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcase } from "@/components/product-showcase";

export const metadata: Metadata = {
  title: "Produto",
  description: "Veja como a equipe da academia e os alunos usam o Bota o Shape! no dia a dia.",
  alternates: { canonical: "/produto" },
  openGraph: { url: "/produto", title: "Produto · Bota o Shape!" },
  twitter: { card: "summary", title: "Produto · Bota o Shape!", description: "Conheça as telas de gestão e do aplicativo do aluno." },
};

export default function ProductPage() {
  return (
    <>
      <section className="product-hero">
        <div className="wrap">
          <span className="eyebrow">O Produto</span>
          <h1>Tudo o que você precisa para gerir sua academia</h1>
          <p>Conheça as telas reais usadas pela gestão, professores, nutricionistas e alunos.</p>
        </div>
      </section>
      <div className="wrap"><ProductShowcase /></div>
      <section className="product-cta">
        <div className="wrap actions">
          <Link href="/cadastro" className="btn">Criar conta</Link>
          <Link href="/planos" className="btn ghost-dark">Ver planos</Link>
        </div>
      </section>
    </>
  );
}
