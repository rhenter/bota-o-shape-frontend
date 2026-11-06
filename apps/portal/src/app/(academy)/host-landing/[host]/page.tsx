import type { Metadata } from "next";
import { AcademyLanding, AcademyUnavailable } from "@/components/academy-landing";
import { fetchAcademy } from "@/lib/api";

type Props = { params: Promise<{ host: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host } = await params;
  const result = await fetchAcademy({ host: decodeURIComponent(host) });
  if (result.status !== "ok") return { title: "Academia", robots: { index: false } };
  const { academy } = result;
  return { title: academy.name, description: academy.profile.tagline, alternates: { canonical: "/" } };
}

/** Reached only through the proxy rewrite for verified custom domains. */
export default async function HostLanding({ params }: Props) {
  const { host } = await params;
  const result = await fetchAcademy({ host: decodeURIComponent(host) });
  if (result.status === "ok") return <AcademyLanding academy={result.academy} />;
  return <AcademyUnavailable failed={result.status === "error"} />;
}
