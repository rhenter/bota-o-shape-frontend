import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcase } from "@/components/product-showcase";
import { getMessages } from "@/i18n/server";
import { portugueseSocial } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.productTitle,
    description: meta.productDescription,
    alternates: { canonical: "/produto" },
    ...portugueseSocial("product"),
  };
}

export default async function ProductPage() {
  const { product } = await getMessages();
  return (
    <>
      <section className="product-hero">
        <div className="wrap">
          <span className="eyebrow">{product.eyebrow}</span>
          <h1>{product.title}</h1>
          <p>{product.lead}</p>
        </div>
      </section>
      <div className="wrap"><ProductShowcase /></div>
      <section className="product-cta">
        <div className="wrap actions">
          <Link href="/cadastro" className="btn">{product.signup}</Link>
          <Link href="/planos" className="btn ghost-dark">{product.plans}</Link>
        </div>
      </section>
    </>
  );
}
