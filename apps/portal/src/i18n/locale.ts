export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export const LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";

/** A saved presentation choice overrides the browser language. */
export function localeFromCookie(value: string | null | undefined): Locale | null {
  return value === "pt-BR" || value === "en" ? value : null;
}

/** Pick a supported locale from an Accept-Language header. Portuguese is the default. */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header?.trim()) return "pt-BR";
  const ranges: Array<{ tag: string; q: number }> = [];
  for (const part of header.split(",")) {
    const [rawTag, ...params] = part.split(";").map((piece) => piece.trim());
    if (!rawTag) continue;
    let q = 1;
    for (const param of params) {
      const match = /^q=([0-9.]+)$/i.exec(param);
      if (match) q = Number(match[1]);
    }
    if (!Number.isFinite(q) || q <= 0) continue;
    ranges.push({ tag: rawTag.toLowerCase(), q });
  }
  ranges.sort((left, right) => right.q - left.q);
  for (const range of ranges) {
    if (range.tag === "pt" || range.tag.startsWith("pt-")) return "pt-BR";
    if (range.tag === "en" || range.tag.startsWith("en-")) return "en";
  }
  return "pt-BR";
}
