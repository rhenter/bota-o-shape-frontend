/** Landing logos are uploaded to the API and published as `/media/...`, not as an external https URL. */
export function landingLogoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  let path = trimmed;
  if (!trimmed.startsWith("/")) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      path = url.pathname.startsWith("/media/") ? `${url.pathname}${url.search}` : url.protocol === "https:" ? url.toString() : "";
    } catch {
      return null;
    }
  }
  if (!path) return null;
  if (path.startsWith("/media/")) {
    if (path.includes("..") || path.includes("\\") || path.startsWith("//")) return null;
    return path;
  }
  return path.startsWith("https://") ? path : null;
}
