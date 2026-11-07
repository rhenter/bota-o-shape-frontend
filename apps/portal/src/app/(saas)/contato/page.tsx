import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.contactTitle,
    description: meta.contactDescription,
    alternates: { canonical: "/contato" },
    openGraph: { url: "/contato", title: meta.contactOgTitle, description: meta.contactOgDescription },
    twitter: { card: "summary", title: meta.contactOgTitle, description: meta.contactTwitterDescription },
  };
}

export default async function ContactPage() {
  const { contact } = await getMessages();
  return <section className="contact-page wrap"><div><span className="eyebrow dark">{contact.eyebrow}</span><h1>{contact.title}</h1><p>{contact.lead}</p></div><ContactForm /></section>;
}
