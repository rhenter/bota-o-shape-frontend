import type { ApiMeasurement } from "./api-client";
export const comparisonLabels = {
  not_comparable: "Sem comparação direta",
  increased: "Aumentou",
  decreased: "Diminuiu",
  unchanged: "Sem alteração",
};
export function compatibleMeasurements(a: ApiMeasurement, b: ApiMeasurement) {
  const fields = ["metric", "unit", "side", "anatomical_site", "method", "protocol", "origin"] as const;
  return (
    fields.every((key) => a[key] === b[key]) &&
    !a.possible_error &&
    !b.possible_error &&
    JSON.stringify(a.equation_metadata) === JSON.stringify(b.equation_metadata)
  );
}
export function compareMeasurements(
  current: ApiMeasurement,
  previous?: ApiMeasurement,
): {
  status: keyof typeof comparisonLabels;
  difference?: number;
  percent?: number | null;
} {
  if (!previous || !compatibleMeasurements(current, previous))
    return { status: "not_comparable" };
  const value = Number(current.raw_value),
    prior = Number(previous.raw_value);
  if (!Number.isFinite(value) || !Number.isFinite(prior))
    return { status: "not_comparable" };
  const difference = value - prior;
  return {
    status:
      difference > 0 ? "increased" : difference < 0 ? "decreased" : "unchanged",
    difference,
    percent: prior === 0 ? null : (difference / prior) * 100,
  };
}

export function measurementMethod(method: string): string {
  return (
    {
      circumference: "Perímetros",
      skinfold: "Dobras cutâneas",
      bioimpedance: "Bioimpedância",
    }[method] ?? method
  );
}

export function measurementSide(side: string): string {
  return { left: "Esquerdo", right: "Direito", bilateral: "Bilateral" }[side] ?? side;
}

export function assessmentContext(record: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    brand: "Marca",
    model: "Modelo",
    description: "Descrição",
    hydration: "Hidratação",
    food: "Alimentação / jejum",
    recent_exercise: "Exercício recente",
    notes: "Observações",
    equation: "Equação",
    population: "População",
    applicability: "Aplicabilidade",
    responsible: "Responsável",
  };
  return (
    Object.entries(record)
      .filter(([, value]) => value != null && value !== "")
      .map(
        ([key, value]) =>
          `${labels[key] ?? key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
      )
      .join(" · ") || "Não informado"
  );
}
