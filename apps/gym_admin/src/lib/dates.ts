// Assessment dates use the academy's display timezone in filters and agenda alike.
export const assessmentTimeZone = "America/Sao_Paulo";
export function assessmentDateKey(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: assessmentTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
