import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { DemoProvider } from "./app-context";
import { useTrainingData } from "./use-training-data";
import { apiClient } from "@/lib/api-client";
import { AssessmentReport } from "./assessments/assessment-report";
import { demoIds } from "@/lib/demo-repository";
vi.mock("next/navigation", () => ({
  usePathname: () => "/avaliacoes/relatorio",
}));
afterEach(() => {
  apiClient.clearSession();
  vi.unstubAllGlobals();
});
function Harness() {
  const { data, updateDemo, setTenantId, logout } = useTrainingData();
  return (
    <>
      <output aria-label="Modelos">
        {data.templates.map((t) => t.name).join(", ")}
      </output>
      <button
        onClick={() =>
          updateDemo((d) => ({
            ...d,
            templates: [
              ...d.templates,
              {
                ...d.templates[0],
                id: "temporary-id",
                name: "Modelo temporário",
              },
            ],
          }))
        }
      >
        Salvar exemplo
      </button>
      <button onClick={() => setTenantId(demoIds.secondTenant)}>
        Outra academia
      </button>
      <button onClick={() => setTenantId(demoIds.tenant)}>
        Voltar academia
      </button>
      <button
        onClick={() => {
          void logout();
        }}
      >
        Sair
      </button>
    </>
  );
}
it("isola rascunhos demo por academia e os remove ao sair sem chamar a API", async () => {
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(
    <DemoProvider mode="demo">
      <Harness />
    </DemoProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Salvar exemplo" }));
  expect(screen.getByLabelText("Modelos")).toHaveTextContent(
    "Modelo temporário",
  );
  await user.click(screen.getByRole("button", { name: "Outra academia" }));
  expect(screen.getByLabelText("Modelos")).not.toHaveTextContent(
    "Modelo temporário",
  );
  await user.click(screen.getByRole("button", { name: "Voltar academia" }));
  expect(screen.getByLabelText("Modelos")).toHaveTextContent(
    "Modelo temporário",
  );
  await user.click(screen.getByRole("button", { name: "Sair" }));
  expect(screen.getByLabelText("Modelos")).not.toHaveTextContent(
    "Modelo temporário",
  );
  expect(fetcher).not.toHaveBeenCalled();
});

function ScopedHarness() {
  const { login, data, trainingLoading } = useTrainingData();
  return (
    <>
      <button
        onClick={() => {
          void login("professional@example.test", "password");
        }}
      >
        Entrar
      </button>
      {!trainingLoading && (
        <output aria-label="Dados carregados">{JSON.stringify(data)}</output>
      )}
    </>
  );
}

it.each(["coach", "dietitian", "admin", "owner"])(
  "preserva o escopo de acesso a alunos do perfil %s",
  async (role) => {
    const json = (data: unknown) => new Response(JSON.stringify(data));
    const page = (results: unknown[]) =>
      json({ count: results.length, next: null, results });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("auth/token/"))
        return json({
          access: `header.${btoa(JSON.stringify({ user_id: "professional-1" }))}.signature`,
          refresh: "r1",
        });
      if (url.endsWith("tenants/"))
        return page([
          {
            id: "tenant-1",
            name: "Academia",
            legal_name: "Academia",
            cnpj: null,
          },
        ]);
      if (url.endsWith("users/"))
        return page([
          {
            id: "professional-1",
            first_name: "Profissional",
            last_name: "",
            email: "professional@example.test",
          },
          {
            id: "unlinked-student",
            first_name: "Sem vínculo",
            last_name: "",
            email: "student@example.test",
          },
        ]);
      if (url.endsWith("memberships/"))
        return page([
          {
            id: "m1",
            user: "professional-1",
            email: "professional@example.test",
            status: "active",
            roles: [role],
          },
          {
            id: "m2",
            user: "unlinked-student",
            email: "student@example.test",
            status: "active",
            roles: ["student"],
          },
        ]);
      if (
        /assignments\/|sessions\/|assessments\/assessments\/|consents\//.test(
          url,
        )
      )
        return page([
          {
            id: "sensitive-tenant-record",
            student: "unlinked-student",
            subject: "unlinked-student",
            consent: "private-consent",
            assessed_at: "2026-10-17T12:00:00Z",
            status: "completed",
            measurements: [],
            device: {},
            preparation_conditions: {},
            notes: "Registro sensível de aluno sem vínculo",
            released_at: null,
          },
        ]);
      return page([]);
    });
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <ScopedHarness />
        <AssessmentReport assessmentId="sensitive-tenant-record" />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const admin = role === "admin" || role === "owner";
    if (admin) {
      expect(
        await screen.findByRole("heading", { name: "Resultado da avaliação" }),
      ).toBeVisible();
      expect(
        await screen.findByLabelText("Dados carregados"),
      ).toHaveTextContent("sensitive-tenant-record");
      expect(
        screen.getByRole("button", { name: "Liberar para o aluno" }),
      ).toBeVisible();
    } else {
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "alunos vinculados",
      );
      expect(
        await screen.findByLabelText("Dados carregados"),
      ).not.toHaveTextContent("sensitive-tenant-record");
      expect(
        screen.queryByText("Registro sensível de aluno sem vínculo"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Liberar para o aluno" }),
      ).not.toBeInTheDocument();
    }
    expect(
      fetcher.mock.calls.some(([url]) =>
        /assignments\/|sessions\/|assessments\/assessments\/|consents\//.test(
          String(url),
        ),
      ),
    ).toBe(admin);
    expect(
      fetcher.mock.calls.some(([url]) =>
        /transition\/|report\//.test(String(url)),
      ),
    ).toBe(false);
  },
);
