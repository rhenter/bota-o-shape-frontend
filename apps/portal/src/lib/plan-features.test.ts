import { describe, expect, it } from "vitest";
import { ptBR } from "@/i18n/pt-BR";
import type { Plan } from "@/lib/api";
import { visiblePlanFeatures } from "@/lib/plan-features";

const copy = ptBR.plans;

function plan(code: string, features: string[]): Plan {
  return { id: code, code, name: code, features, limits: {}, price_reference: "" };
}

describe("visiblePlanFeatures", () => {
  it("lists the Start features in the commercial order", () => {
    expect(visiblePlanFeatures(plan("start", ["student_app", "workouts", "assessments"]), copy)).toEqual([
      "App do aluno",
      "Gestão de treinos",
      "Avaliações físicas",
    ]);
  });

  it("collapses Pro into the Start line plus its own features", () => {
    expect(visiblePlanFeatures(plan("pro", [
      "student_app",
      "workouts",
      "assessments",
      "nutrition",
      "reports_metrics",
      "priority_support",
    ]), copy)).toEqual([
      "Todas as features do Start",
      "Nutrição (planos alimentares)",
      "Relatórios e métricas",
      "Suporte prioritário",
    ]);
  });

  it("collapses Enterprise into the Pro line plus its own features", () => {
    expect(visiblePlanFeatures(plan("enterprise", [
      "student_app",
      "workouts",
      "assessments",
      "nutrition",
      "reports_metrics",
      "priority_support",
      "multiple_units",
      "landing_page",
      "landing_page_custom",
    ]), copy)).toEqual([
      "Todas as features do Pro",
      "Múltiplas unidades",
      "Página Padrão para a academia",
      "Página Customizada para a academia",
    ]);
  });

  it("keeps the previous custom landing page code compatible", () => {
    expect(visiblePlanFeatures(plan("other", ["landing_page_customization"]), copy)).toEqual([
      "Página Customizada para a academia",
    ]);
  });
});
