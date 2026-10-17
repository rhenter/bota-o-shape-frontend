import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { DemoProvider, useAppContext } from "./app-context";

const token = `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`;
const page = (results: unknown[]) =>
  new Response(JSON.stringify({ count: results.length, next: null, results }), {
    status: 200,
  });

afterEach(() => {
  apiClient.clearSession();
  vi.unstubAllGlobals();
});

function Harness() {
  const {
    login,
    setTenantId,
    context,
    repository,
    loading,
    error,
    membership,
  } = useAppContext();
  return (
    <>
      <button
        onClick={() => {
          void login("owner@example.test", "test-password");
        }}
      >
        Entrar
      </button>
      <button onClick={() => setTenantId("t2")}>Trocar</button>
      <p>{loading ? "Carregando" : "Pronto"}</p>
      <p>{error}</p>
      <p>Funções: {membership?.roles.join(",")}</p>
      {repository.getStudents(context).map((student) => (
        <p key={student.id}>{student.name}</p>
      ))}
    </>
  );
}

function mockApi(role = "owner") {
  return vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = String(input);
    const tenant = new Headers(init?.headers).get("X-Tenant-ID") ?? "t1";
    if (url.endsWith("auth/token/"))
      return new Response(JSON.stringify({ access: token, refresh: "r1" }));
    if (url.endsWith("tenants/"))
      return page([
        { id: "t1", name: "Academia A", legal_name: "A", cnpj: null },
        { id: "t2", name: "Academia B", legal_name: "B", cnpj: null },
      ]);
    if (url.endsWith("memberships/"))
      return page([
        {
          id: "m1",
          user: "u1",
          email: "owner@example.test",
          status: "active",
          roles: [role],
        },
        ...(role === "owner"
          ? [
              {
                id: `m-${tenant}`,
                user: `s-${tenant}`,
                email: "student@example.test",
                status: "active",
                roles: ["student"],
              },
            ]
          : []),
      ]);
    if (url.endsWith("users/"))
      return page([
        {
          id: "u1",
          first_name: "Profissional",
          last_name: "",
          email: "owner@example.test",
        },
        {
          id: `s-${tenant}`,
          first_name: tenant === "t1" ? "Aluno A" : "Aluno B",
          last_name: "",
          email: "student@example.test",
        },
      ]);
    return page([]);
  });
}

describe("snapshot da API por academia", () => {
  it("mapeia owner sem confiar nas claims para conceder papel e troca o snapshot", async () => {
    vi.stubGlobal("fetch", mockApi());
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Harness />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Aluno A")).toBeVisible();
    expect(screen.getByText("Funções: admin")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Trocar" }));
    expect(screen.queryByText("Aluno A")).not.toBeInTheDocument();
    expect(await screen.findByText("Aluno B")).toBeVisible();
  });

  it("bloqueia o painel para um vínculo somente de aluno", async () => {
    vi.stubGlobal("fetch", mockApi("student"));
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Harness />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(screen.getByText(/O painel é exclusivo/)).toBeVisible(),
    );
    expect(screen.queryByText("Aluno A")).not.toBeInTheDocument();
    expect(screen.getByText("Funções:")).toBeVisible();
  });
});
