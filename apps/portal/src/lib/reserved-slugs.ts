/** Paths owned by the portal, the gym admin, the API, or static files. They are not academy slugs.
 * Keep this set aligned with `RESERVED_SLUGS` in the tenancy API.
 */
export const RESERVED_SLUGS = new Set([
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
