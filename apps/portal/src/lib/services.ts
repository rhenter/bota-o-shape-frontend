export const PUBLIC_SERVICE_CODES = [
  "strength_training",
  "functional_training",
  "cardio",
  "group_classes",
  "nutrition",
  "physical_assessment",
] as const;

export type PublicServiceCode = (typeof PUBLIC_SERVICE_CODES)[number];

export type OfferedService = { code: string; title: string };

/** Preserve the API order and identifiers. Unknown codes remain visible with a generic icon. */
export function offeredServices(
  codes: unknown,
  labels: Record<PublicServiceCode, string>,
): OfferedService[] {
  if (!Array.isArray(codes)) return [];
  return codes.flatMap((value): OfferedService[] => {
    if (typeof value !== "string" || !value.trim()) return [];
    const code = value.trim();
    const known = (PUBLIC_SERVICE_CODES as readonly string[]).includes(code);
    return [{ code, title: known ? labels[code as PublicServiceCode] : code }];
  });
}
