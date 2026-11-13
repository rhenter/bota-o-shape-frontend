/** First URL segments owned by the portal, the API, or static files.
 * Keep this set aligned with `RESERVED_SLUGS` in the tenancy API.
 */
export const RESERVED_PUBLIC_SLUGS = new Set([
  "_next",
  "academy",
  "admin",
  "api",
  "app",
  "brand",
  "cadastro",
  "contato",
  "favicon",
  "health",
  "host-landing",
  "icon",
  "login",
  "planos",
  "produto",
  "robots",
  "screens",
  "sitemap",
  "static",
  "www",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicSlugIssue = "invalid" | "reserved" | "taken" | "unknown";

export function normalizePublicSlug(value: string): string {
  return value.trim().toLowerCase();
}

/** Local check. `null` means the value is empty (allowed) or looks free. Uniqueness is confirmed by the API. */
export function publicSlugIssue(slug: string): PublicSlugIssue | null {
  if (!slug) return null;
  if (slug.length > 63 || !SLUG_PATTERN.test(slug)) return "invalid";
  if (RESERVED_PUBLIC_SLUGS.has(slug)) return "reserved";
  return null;
}

export function publicSlugMessage(issue: PublicSlugIssue): string {
  switch (issue) {
    case "invalid":
      return "Use letras minúsculas, números e hífens, sem espaços ou acentos.";
    case "reserved":
      return "Este endereço é interno do sistema e não pode ser usado.";
    case "taken":
      return "Este endereço já está em uso por outra academia.";
    case "unknown":
      return "Não foi possível confirmar se este endereço está livre. Tente de novo antes de salvar.";
  }
}
