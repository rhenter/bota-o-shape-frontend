import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademyLanding, AcademyUnavailable } from "@/components/academy-landing";
import { getMessages } from "@/i18n/server";
import { fetchAcademy } from "@/lib/api";

type Props = { params: Promise<{ academySlug: string }> };

/** Paths owned by the gym admin, the API, or the healthcheck. They are not academy slugs. */
const RESERVED_SLUGS = new Set(["admin", "api", "health"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { academySlug } = await params;
  if (RESERVED_SLUGS.has(academySlug)) return { title: (await getMessages()).meta.academyTitle, robots: { index: false } };
  const result = await fetchAcademy({ slug: academySlug });
  if (result.status !== "ok") return { title: (await getMessages()).meta.academyTitle, robots: { index: false } };
  const { academy } = result;
  return {
    title: academy.name,
    description: academy.profile.tagline,
    alternates: { canonical: `/${academy.slug}` },
    openGraph: { title: academy.name, description: academy.profile.tagline, url: `/${academy.slug}` },
  };
}

export default async function AcademyPage({ params }: Props) {
  const { academySlug } = await params;
  if (RESERVED_SLUGS.has(academySlug)) notFound();
  const result = await fetchAcademy({ slug: academySlug });
  if (result.status === "not_found") notFound();
  const messages = await getMessages();
  if (result.status === "error") return <AcademyUnavailable failed messages={messages} />;
  return <AcademyLanding academy={result.academy} messages={messages} />;
}
