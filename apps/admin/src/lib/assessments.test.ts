import { describe, expect, it } from "vitest";
import { compareMeasurements } from "./assessments";
import type { ApiMeasurement } from "./api-client";
const current: ApiMeasurement = {
  id: "m1",
  metric: "Cintura",
  raw_value: "82",
  unit: "cm",
  side: "",
  anatomical_site: "Ponto médio",
  method: "circumference",
  protocol: "p1",
  origin: "manual",
  equation_metadata: {},
  possible_error: false,
};
describe("comparação de avaliação", () => {
  it.each([
    { method: "bioimpedance" },
    { protocol: "p2" },
    { anatomical_site: "Umbigo" },
    { side: "left" },
    { unit: "mm" },
  ])("não compara coleta incompatível: %o", (change) => {
    expect(
      compareMeasurements(current, { ...current, ...change, raw_value: "80" }),
    ).toEqual({ status: "not_comparable" });
  });
  it("calcula diferença sem julgamento clínico e preserva o zero", () => {
    expect(
      compareMeasurements(current, { ...current, raw_value: "80" }),
    ).toEqual({ status: "increased", difference: 2, percent: 2.5 });
    expect(
      compareMeasurements(current, { ...current, raw_value: "0" }),
    ).toEqual({ status: "increased", difference: 82, percent: null });
    expect(compareMeasurements(current)).toEqual({ status: "not_comparable" });
  });
});
