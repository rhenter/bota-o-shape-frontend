import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkoutBuilder } from "./workout-builder";
import { exercises } from "@/lib/demo-data";

describe("montador de treino", () => {
  it("mantém orientação, instrução permanente e nota pessoal separadas e edita cada série", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WorkoutBuilder exercises={[...exercises]} onSave={save} />);
    await user.type(screen.getByLabelText("Nome do modelo *"), "Treino teste");
    await user.click(
      screen.getByRole("button", { name: "Adicionar exercício" }),
    );
    await user.type(
      screen.getByLabelText("Observação do professor"),
      "Ajustar amplitude",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar série" }));
    const sets = screen.getAllByRole("group", { name: /^Série / });
    await user.type(within(sets[0]).getByLabelText("Repetições mínimas"), "8");
    await user.type(within(sets[1]).getByLabelText("Repetições mínimas"), "12");
    await user.type(
      within(sets[1]).getByLabelText("Nota da série"),
      "Última série",
    );
    expect(screen.getByLabelText("Minha anotação")).toBeDisabled();
    const preview = screen.getByRole("region", { name: "Prévia do aluno" });
    expect(within(preview).getByText("Ajustar amplitude")).toBeVisible();
    await user.click(within(preview).getByText("Instruções da biblioteca"));
    expect(
      within(preview).getByText(exercises[0].instructions[0]),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const data = save.mock.calls[0][0];
    expect(data.days[0].exercises[0]).toMatchObject({
      coach_observation: "Ajustar amplitude",
      sets: [
        { repetitions_min: 8 },
        { repetitions_min: 12, note: "Última série" },
      ],
    });
    expect(data.days[0].exercises[0]).not.toHaveProperty("student_note");
    expect(data.days[0].exercises[0]).not.toHaveProperty("instructions");
  });
});
