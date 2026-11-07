import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PublicContactLinks } from "@/components/public-contact-links";
import { getMessages } from "@/i18n/server";
import { ADMIN_URL, fetchPublicContact } from "@/lib/api";

export default async function SaasLayout({ children }: { children: ReactNode }) {
  const [contact, messages] = await Promise.all([fetchPublicContact(), getMessages()]);
  const nav = messages.nav;
  return (
    <>
      <a href="#conteudo" className="skip">{nav.skip}</a>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand" aria-label={nav.brand}><BrandLogo priority /></Link>
          <nav aria-label={nav.primary}>
            <Link href="/">{nav.home}</Link>
            <Link href="/produto">{nav.product}</Link>
            <Link href="/planos">{nav.plans}</Link>
            <Link href="/contato">{nav.contact}</Link>
            <Link href="/#faq">{nav.help}</Link>
            <a href={`${ADMIN_URL}/entrar`} className="btn outline-nav">{nav.login}</a>
            <Link href="/cadastro" className="btn">{nav.start}</Link>
          </nav>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer><div className="wrap">© Bota o Shape!<PublicContactLinks contact={contact} label={messages.contact.whatsapp} /></div></footer>
    </>
  );
}
