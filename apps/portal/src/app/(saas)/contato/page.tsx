import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a equipe do Bota o Shape! sobre demonstrações, planos e propostas.",
  alternates: { canonical: "/contato" },
  openGraph: { url: "/contato", title: "Contato · Bota o Shape!", description: "Envie uma mensagem para a equipe do Bota o Shape!." },
  twitter: { card: "summary", title: "Contato · Bota o Shape!", description: "Fale com a equipe do Bota o Shape!." },
};

export default function ContactPage() {
  return <section className="contact-page wrap"><div><span className="eyebrow dark">Contato</span><h1>Como podemos ajudar?</h1><p>Envie sua dúvida sobre demonstrações, planos ou propostas. Não informe dados de saúde ou senhas.</p></div><ContactForm /></section>;
}
