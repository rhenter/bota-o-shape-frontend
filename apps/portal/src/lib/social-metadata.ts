import type { Metadata } from "next";
import { ptBR } from "@/i18n/pt-BR";

const social = ptBR.meta;

/** Shared-link preview. One URL is cached once, so the card stays in Portuguese. */
const pages = {
  site: { title: social.siteTitle, description: social.siteDescription, url: "/" },
  home: { title: social.homeOgTitle, description: social.homeDescription, url: "/" },
  product: { title: social.productOgTitle, description: social.productDescription, url: "/produto" },
  plans: { title: social.plansOgTitle, description: social.plansDescription, url: "/planos" },
  contact: { title: social.contactOgTitle, description: social.contactDescription, url: "/contato" },
  signup: { title: social.signupOgTitle, description: social.signupTwitterDescription, url: "/cadastro" },
} as const;

export type SocialPage = keyof typeof pages;

const image = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Bota o Shape! — Gestão completa para academias",
};

export function portugueseSocial(page: SocialPage): Pick<Metadata, "openGraph" | "twitter"> {
  const fields = pages[page];
  return {
    openGraph: {
      title: fields.title,
      description: fields.description,
      url: fields.url,
      locale: social.ogLocale,
      siteName: "Bota o Shape!",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fields.title,
      description: fields.description,
      images: [image.url],
    },
  };
}
