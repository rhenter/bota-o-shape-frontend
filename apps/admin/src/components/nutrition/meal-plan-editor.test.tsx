import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealPlanEditor } from "./meal-plan-editor";
import { FoodSearch, FoodComposition } from "./food-search";
import { NutritionTotals } from "./nutrition-totals";
import { TeamTable } from "../admin/team-table";
import { DemoProvider } from "../app-context";
vi.mock("next/navigation", () => ({ usePathname: () => "/nutricao" }));
describe("nutrition and team safeguards", () => {
  it("keeps totals unknown when any portion lacks a nutrient", () => {
    const snapshot = {
      food_id: "f",
      description: "Arroz",
      preparation_state: "Cozido",
      grams: "100",
      source: "tbca",
      source_version: "2023",
      external_id: "123",
      estimated: true,
      nutrients: {
        protein_g: { name: "Proteína", value: "0", per_100g: "0", unit: "g" },
      },
    };
    const { rerender } = render(
      <NutritionTotals snapshots={[snapshot, undefined]} />,
    );
    expect(screen.getByText("Não calculado — dados incompletos")).toBeVisible();
    rerender(<NutritionTotals snapshots={[snapshot, snapshot]} />);
    expect(screen.getByText("0 g")).toBeVisible();
  });
  it("denies authoring to an administrator without clinical qualification", () => {
    render(
      <DemoProvider mode="api">
        <MealPlanEditor />
      </DemoProvider>,
    );
    expect(screen.getByText(/CRN\/UF verificado/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Publicar e atribuir/ }),
    ).not.toBeInTheDocument();
  });
  it("keeps food source and preparation visible", () => {
    render(
      <FoodSearch
        foods={[
          {
            id: "f",
            name: "Arroz",
            preparation_state: "Cozido",
            external_id: "123",
            branded: false,
            reviewed: true,
            edible_description: "",
            household_measures: [],
            source: {
              id: "src",
              name: "TBCA",
              kind: "tbca",
              version: "2023",
              license_status: "reviewed",
              attribution_url: "",
              is_active: true,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText(/TBCA · 2023 · Cozido/)).toBeVisible();
  });
  it("does not turn missing nutrients into zero", () => {
    render(
      <FoodComposition
        snapshot={{
          food_id: "f",
          description: "Arroz",
          preparation_state: "Cozido",
          grams: "50",
          source: "tbca",
          source_version: "2023",
          external_id: "123",
          estimated: true,
          nutrients: {
            protein: { name: "Proteína", value: "0", per_100g: "0", unit: "g" },
            fiber: { name: "Fibra", value: "1.25", per_100g: "2.5", unit: "g" },
            fat: { name: "Gordura", value: "", per_100g: "", unit: "g" },
          },
        }}
      />,
    );
    expect(screen.getByText("0 g")).toBeVisible();
    expect(screen.getByText("1,25 g")).toBeVisible();
    expect(screen.getByText("Base por 100 g: 2,5 g")).toBeVisible();
    expect(screen.getByText("Base por 100 g: Não informado")).toBeVisible();
    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(0);
  });
  it("shows combined professional roles and safe reset copy", () => {
    render(
      <TeamTable
        members={[
          {
            id: "m",
            user: "u",
            email: "prof@example.test",
            status: "active",
            roles: ["coach", "dietitian"],
          },
        ]}
        users={[]}
        credentials={[]}
      />,
    );
    expect(screen.getByText("Professor")).toBeVisible();
    expect(screen.getByText("Nutricionista")).toBeVisible();
    expect(screen.getByText(/A pessoa recebe instruções/)).toBeVisible();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });
});
