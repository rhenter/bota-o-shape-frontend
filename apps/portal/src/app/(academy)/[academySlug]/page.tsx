import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademyLanding, AcademyUnavailable } from "@/components/academy-landing";
import { getMessages } from "@/i18n/server";
import { fetchAcademy, fetchPublicContact, platformLinks } from "@/lib/api";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";

type Props = { params: Promise<{ academySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { academySlug } = await params;
  if (RESERVED_SLUGS.has(academySlug)) return { title: (await getMessages()).meta.academyTitle, robots: { index: false } };
  const result = await fetchAcademy({ slug: academySlug });
  if (result.status !== "ok") return { title: (await getMessages()).meta.academyTitle, robots: { index: false } };
  const { academy } = result;
  return {
    title: academy.name,
    description: academy.landing?.title || academy.profile.tagline,
    alternates: { canonical: `/${academy.slug}` },
    openGraph: { title: academy.name, description: academy.landing?.title || academy.profile.tagline, url: `/${academy.slug}` },
  };
}

export default async function AcademyPage({ params }: Props) {
  const { academySlug } = await params;
  if (RESERVED_SLUGS.has(academySlug)) notFound();
  const [result, messages, contact] = await Promise.all([
    fetchAcademy({ slug: academySlug }),
    getMessages(),
    fetchPublicContact(),
  ]);
  if (result.status === "not_found") notFound();
  if (result.status === "error") return <AcademyUnavailable failed messages={messages} />;
  return <AcademyLanding academy={result.academy} messages={messages} platform={platformLinks(contact)} />;
}
