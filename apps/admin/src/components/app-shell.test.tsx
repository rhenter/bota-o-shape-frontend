import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell, DemoProvider, useDemoContext } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

function TenantName() {
  const { tenant } = useDemoContext();
  return <p>Tenant atual: {tenant.name}</p>;
}

describe("painel de demonstração", () => {
  it("oferece navegação acessível por teclado e identifica o modo demo", async () => {
    const user = userEvent.setup();
    render(
      <DemoProvider mode="demo">
        <AppShell>
          <TenantName />
        </AppShell>
      </DemoProvider>,
    );
    expect(screen.getByText(/ambiente de demonstração/i)).toBeVisible();
    await user.tab();
    expect(
      screen.getByRole("link", { name: "Ir para o conteúdo" }),
    ).toHaveFocus();
    expect(screen.getByRole("link", { name: /visão geral/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await user.click(screen.getByRole("button", { name: "Abrir navegação" }));
    expect(
      screen.getByRole("button", { name: "Fechar navegação" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Abrir navegação" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("alterna somente entre academias vinculadas", async () => {
    const user = userEvent.setup();
    render(
      <DemoProvider mode="demo">
        <AppShell>
          <TenantName />
        </AppShell>
      </DemoProvider>,
    );
    expect(screen.getByText("Tenant atual: Academia Horizonte")).toBeVisible();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Academia ativa" }),
      "00000000-0000-4000-8000-000000000102",
    );
    expect(screen.getByText("Tenant atual: Academia Movimento")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /cobrança/i }),
    ).not.toBeInTheDocument();
  });

  it("exige sessão no modo API, sem apresentar dados fictícios como fallback", () => {
    render(
      <DemoProvider mode="api">
        <AppShell>
          <TenantName />
        </AppShell>
      </DemoProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Entre para acessar o painel" }),
    ).toBeVisible();
    expect(
      screen.queryByText(/ambiente de demonstração/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Academia Horizonte/)).not.toBeInTheDocument();
  });
});
