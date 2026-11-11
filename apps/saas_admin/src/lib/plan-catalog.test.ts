import { describe, expect, it } from "vitest";

import {
  draftFromVersion,
  featureRows,
  isQuotePrice,
  limitRows,
  limitSummary,
  planPublishPayload,
} from "./plan-catalog";
import type { PlatformPlanVersion } from "./platform-api";

const version: PlatformPlanVersion = {
  id: "1",
  version: 2,
  features: {
    has_student_app: false,
    has_workouts: true,
    has_assessments: false,
    has_nutrition: false,
    has_reports_metrics: false,
    has_priority_support: false,
    has_multiple_units: false,
    has_landing_page: false,
    has_landing_page_custom: false,
  },
  limits: { active_students: 300 },
  price_reference: "R$ 199,00/mês",
  monthly_price_minor: 19900,
  currency: "BRL",
  published_at: "2026-01-01T00:00:00Z",
};

describe("plan catalog publication", () => {
  it("treats a zero price as a quote and leaves blank limits unlimited", () => {
    expect(isQuotePrice({ ...version, monthly_price_minor: 0 })).toBe(true);
    expect(limitSummary({})).toContain("Alunos ativos: ilimitado");
    expect(limitSummary({ active_students: 300 })).toContain("Alunos ativos: 300");
  });

  it("publishes the next version from the form without migrating the current contract", () => {
    const result = planPublishPayload({
      ...draftFromVersion(version),
      price: "249,90",
      reason: "Reajuste anual do catálogo",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.monthly_price_minor).toBe(24990);
      expect(result.payload.currency).toBe("BRL");
      expect(result.payload.limits).toEqual({ active_students: 300 });
      expect(result.payload.price_reference).toBe("R$\u00a0249,90/mês");
      expect(result.payload.features).toMatchObject({ has_workouts: true, has_student_app: false });
    }
  });

  it("rejects a short reason before calling the API", () => {
    const result = planPublishPayload({ ...draftFromVersion(version), reason: "curto" });
    expect(result).toEqual({
      ok: false,
      error: "Informe um motivo com pelo menos 10 caracteres.",
    });
  });

  it("lists every known feature with its on/off state, sorted alphabetically", () => {
    const rows = featureRows(version.features);
    expect(rows).toHaveLength(9);
    expect(rows.find((row) => row.code === "workouts")).toEqual({
      code: "workouts",
      label: "Gestão de treinos",
      enabled: true,
    });
    expect(rows.find((row) => row.code === "student_app")?.enabled).toBe(false);
    expect(rows.map((row) => row.label)).toEqual(
      [...rows.map((row) => row.label)].sort((a, b) => a.localeCompare(b, "pt-BR")),
    );
    expect(rows[0].label).toBe("App do aluno");
  });

  it("lists active limits and marks unknown ones as unlimited", () => {
    const rows = limitRows(version.limits);
    expect(rows.find((row) => row.key === "active_students")).toEqual({
      key: "active_students",
      label: "Alunos ativos",
      value: "300",
    });
    expect(rows.find((row) => row.key === "units")?.value).toBe("ilimitado");
  });
});
