import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PublicContactLinks } from "@/components/public-contact-links";
import { ADMIN_URL, fetchPublicContact } from "@/lib/api";

export default async function SaasLayout({ children }: { children: ReactNode }) {
  const contact = await fetchPublicContact();
  return (
    <>
      <a href="#conteudo" className="skip">Ir para o conteúdo</a>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Bota o Shape! · início"><BrandLogo priority /></Link>
          <nav aria-label="Principal">
            <Link href="/">Home</Link>
            <Link href="/produto">Produto</Link>
            <Link href="/planos">Planos</Link>
            <Link href="/contato">Contato</Link>
            <Link href="/#faq">Ajuda</Link>
            <a href={`${ADMIN_URL}/entrar`} className="btn outline-nav">Entrar</a>
            <Link href="/cadastro" className="btn">Começar agora</Link>
          </nav>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer><div className="wrap">© Bota o Shape!<PublicContactLinks contact={contact} /></div></footer>
    </>
  );
}
