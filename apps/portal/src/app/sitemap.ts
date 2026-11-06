import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/produto", "/planos", "/cadastro", "/contato"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" }));
}
