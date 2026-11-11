import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlansPage from "./page";

afterEach(() => vi.unstubAllGlobals());
const stub = (value: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(value));

describe("PlansPage", () => {
  it("shows the Pro plan with its commercial copy and features", async () => {
    stub({
      ok: true,
      json: async () => ({
        results: [{
          id: "1",
          code: "pro",
          name: "Pro",
          current_version: {
            price_reference: "R$ 299,00/mês",
            limits: { active_students: 500 },
            features: {
              has_student_app: true,
              has_workouts: true,
              has_assessments: true,
              has_nutrition: true,
              has_reports_metrics: true,
              has_priority_support: true,
              has_multiple_units: false,
              has_landing_page: false,
              has_landing_page_custom: false,
            },
          },
        }],
      }),
    });
    render(await PlansPage());
    expect(screen.getByText("Para academias que querem mais controle e engajamento.")).toBeInTheDocument();
    expect(screen.getByText("R$ 299,00/mês")).toBeInTheDocument();
    expect(screen.getByText("Até 500 alunos")).toBeInTheDocument();
    expect(screen.getByText("Todas as features do Start")).toBeInTheDocument();
    expect(screen.getByText("Nutrição (planos alimentares)")).toBeInTheDocument();
    expect(screen.getByText("Relatórios e métricas")).toBeInTheDocument();
    expect(screen.getByText("Suporte prioritário")).toBeInTheDocument();
  });
  it("shows an error when the API fails and never invents availability", async () => {
    stub({ ok: false });
    render(await PlansPage());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 299/)).toBeNull();
  });
  it("shows Enterprise as unlimited with only its additional features", async () => {
    stub({
      ok: true,
      json: async () => ({
        results: [{
          id: "1",
          code: "enterprise",
          name: "Enterprise",
          current_version: {
            price_reference: "Consulte",
            limits: {},
            features: {
              has_student_app: true,
              has_workouts: true,
              has_assessments: true,
              has_nutrition: true,
              has_reports_metrics: true,
              has_priority_support: true,
              has_multiple_units: true,
              has_landing_page: true,
              has_landing_page_custom: true,
            },
          },
        }],
      }),
    });
    render(await PlansPage());
    expect(screen.getByText("Para redes e academias de grande porte.")).toBeInTheDocument();
    expect(screen.getByText("Alunos ilimitados")).toBeInTheDocument();
    expect(screen.getByText("Todas as features do Pro")).toBeInTheDocument();
    expect(screen.getByText("Múltiplas unidades")).toBeInTheDocument();
    expect(screen.getByText("Página Padrão para a academia")).toBeInTheDocument();
    expect(screen.getByText("Página Customizada para a academia")).toBeInTheDocument();
    expect(screen.queryByText("Nutrição (planos alimentares)")).toBeNull();
  });
  it("shows an empty state when Pro is absent", async () => {
    stub({ ok: true, json: async () => ({ results: [] }) });
    render(await PlansPage());
    expect(screen.getByText("Nenhum plano está publicado no momento.")).toBeInTheDocument();
  });
});
