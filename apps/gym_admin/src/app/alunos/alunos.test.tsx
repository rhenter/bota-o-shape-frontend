import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/components/app-shell";
import StudentsPage from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/alunos" }));

describe("alunos", () => {
  it("filtra por nome e status e permite limpar os filtros", async () => {
    const user = userEvent.setup();
    render(
      <DemoProvider mode="demo">
        <StudentsPage />
      </DemoProvider>,
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar alunos" }),
      "ana",
    );
    expect(screen.getByRole("link", { name: "Ana Clara Souza" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "João Pedro Silva" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status do aluno" }),
      "archived",
    );
    expect(screen.getByRole("link", { name: "Bruno Almeida" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Ana Clara Souza" }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar alunos" }),
      "inexistente",
    );
    expect(screen.getByText("Nenhum aluno encontrado")).toBeVisible();
  });

  it("limpa busca e dados ao trocar academia, sem expor aluno de outro tenant", async () => {
    const user = userEvent.setup();
    render(
      <DemoProvider mode="demo">
        <StudentsPage />
      </DemoProvider>,
    );
    await user.type(
      screen.getByRole("searchbox", { name: "Buscar alunos" }),
      "João",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Academia ativa" }),
      "00000000-0000-4000-8000-000000000102",
    );
    expect(
      screen.getByRole("searchbox", { name: "Buscar alunos" }),
    ).toHaveValue("");
    expect(screen.getByRole("link", { name: "Camila Ferreira" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "João Pedro Silva" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /convidar aluno/i }),
    ).not.toBeInTheDocument();
  });
});
