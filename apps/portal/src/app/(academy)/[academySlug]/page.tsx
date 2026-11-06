import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcademyLanding, AcademyUnavailable } from "@/components/academy-landing";
import { fetchAcademy } from "@/lib/api";

type Props = { params: Promise<{ academySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { academySlug } = await params;
  const result = await fetchAcademy({ slug: academySlug });
  if (result.status !== "ok") return { title: "Academia", robots: { index: false } };
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
  const result = await fetchAcademy({ slug: academySlug });
  if (result.status === "not_found") notFound();
  if (result.status === "error") return <AcademyUnavailable failed />;
  return <AcademyLanding academy={result.academy} />;
}
