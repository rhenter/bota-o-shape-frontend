import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { getMessages } from "@/i18n/server";
import { portugueseSocial } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getMessages();
  return {
    title: meta.contactTitle,
    description: meta.contactDescription,
    alternates: { canonical: "/contato" },
    ...portugueseSocial("contact"),
  };
}

export default async function ContactPage() {
  const { contact } = await getMessages();
  return <section className="contact-page wrap"><div><span className="eyebrow dark">{contact.eyebrow}</span><h1>{contact.title}</h1><p>{contact.lead}</p></div><ContactForm /></section>;
}
