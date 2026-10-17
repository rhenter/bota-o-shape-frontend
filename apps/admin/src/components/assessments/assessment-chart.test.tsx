import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AssessmentChart, sameDevice } from "./assessment-chart";
import type { ApiAssessment } from "@/lib/api-client";
const a: ApiAssessment = {
  id: "a1",
  student: "s1",
  consent: "c1",
  assessed_at: "2026-08-01T12:00:00Z",
  device: {},
  preparation_conditions: {},
  notes: "",
  status: "completed",
  released_at: null,
  measurements: [
    {
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
    },
  ],
};
const b: ApiAssessment = {
  ...a,
  id: "a2",
  assessed_at: "2026-09-01T12:00:00Z",
  measurements: [{ ...a.measurements[0], id: "m2", method: "bioimpedance" }],
};
const c: ApiAssessment = {
  ...a,
  id: "a3",
  assessed_at: "2026-10-01T12:00:00Z",
  measurements: [{ ...a.measurements[0], id: "m3", raw_value: "80" }],
};
describe("gráfico acessível", () => {
  it("preserva a lacuna incompatível e oferece tabela com unidade e datas", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AssessmentChart assessments={[a, b, c]} current={c} />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Cintura em cm/);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("82 cm")).toBeVisible();
    expect(within(table).getByText("80 cm")).toBeVisible();
    expect(
      within(table).getByText("Sem comparação direta / medida ausente"),
    ).toBeVisible();
    expect(container.querySelectorAll("svg line")).toHaveLength(0);
    await user.type(screen.getByLabelText("De"), "2026-10-01");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
  });
  it("não trata aparelhos diferentes de bioimpedância como equivalentes", () => {
    expect(
      sameDevice(
        { ...a, device: { brand: "A", model: "1" } },
        { ...c, device: { brand: "B", model: "2" } },
        "bioimpedance",
      ),
    ).toBe(false);
    expect(
      sameDevice({ ...a, device: {} }, { ...c, device: {} }, "bioimpedance"),
    ).toBe(false);
  });
});
