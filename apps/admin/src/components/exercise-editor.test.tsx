import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, type ApiExercise } from "@/lib/api-client";
import { AppShell, DemoProvider, useAppContext } from "./app-shell";
import { ExerciseEditor } from "./exercise-editor";
import ExercisesPage from "@/app/exercicios/page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/exercicios",
  useRouter: () => ({ push }),
}));
afterEach(() => {
  apiClient.clearSession();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const page = (results: unknown[]) =>
  json({ count: results.length, next: null, results });

function Journey({ step }: { step: "create" | "library" | "edit" }) {
  const { login } = useAppContext();
  return (
    <>
      <button
        onClick={() => {
          void login("coach@example.test", "test-password");
        }}
      >
        Entrar
      </button>
      {step === "library" ? (
        <ExercisesPage />
      ) : (
        <AppShell>
          <ExerciseEditor
            key={step}
            exerciseId={step === "edit" ? "e1" : undefined}
          />
        </AppShell>
      )}
    </>
  );
}

describe("rascunho de exercício", () => {
  it("cria, reabre e revisa o mesmo registro por PATCH, sem novo POST", async () => {
    let saved: ApiExercise | undefined;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input, init) => {
        const url = String(input),
          method = init?.method ?? "GET";
        if (url.endsWith("auth/token/"))
          return json({
            access: `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`,
            refresh: "r1",
          });
        if (url.endsWith("tenants/"))
          return page([
            { id: "t1", name: "Academia A", legal_name: "A", cnpj: null },
          ]);
        if (url.endsWith("memberships/"))
          return page([
            {
              id: "m1",
              user: "u1",
              email: "coach@example.test",
              status: "active",
              roles: ["coach"],
            },
          ]);
        if (url.endsWith("users/"))
          return page([
            {
              id: "u1",
              first_name: "Profissional",
              last_name: "",
              email: "coach@example.test",
            },
          ]);
        if (url.endsWith("muscle-groups/"))
          return page([
            { id: "muscle-1", name: "Quadríceps" },
            { id: "muscle-2", name: "Glúteos" },
          ]);
        if (url.endsWith("exercises/e1/")) {
          if (method === "PATCH")
            saved = { ...saved!, ...JSON.parse(String(init?.body)) };
          return saved ? json(saved) : json({}, 404);
        }
        if (url.endsWith("exercises/")) {
          if (method === "POST") {
            const data = JSON.parse(String(init?.body));
            saved = {
              id: "e1",
              ...data,
              instructions: {
                ...data.instructions,
                revisionContext: "preservar",
              },
            };
            return json(saved, 201);
          }
          return page(saved ? [saved] : []);
        }
        return page([]);
      });
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    const app = (step: "create" | "library" | "edit") => (
      <DemoProvider mode="api">
        <Journey step={step} />
      </DemoProvider>
    );
    const view = render(app("create"));
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.type(
      await screen.findByLabelText("Nome do exercício *"),
      "Movimento teste",
    );
    await user.selectOptions(
      screen.getByLabelText("Músculos principais *"),
      "muscle-1",
    );
    await user.selectOptions(
      screen.getByLabelText("Músculos secundários"),
      "muscle-2",
    );
    await user.type(screen.getByLabelText("Descrição"), "Descrição preservada");
    await user.type(screen.getByLabelText("Padrão de movimento"), "Agachar");
    await user.type(screen.getByLabelText("Preparação"), "Preparação inicial");
    await user.type(
      screen.getByLabelText("Execução, passo a passo"),
      "Primeira etapa",
    );
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/exercicios"));
    expect(saved?.review_status).toBe("draft");

    view.rerender(app("library"));
    await user.click(
      await screen.findByRole("button", { name: /Movimento teste/ }),
    );
    expect(
      screen.getByRole("link", { name: "Editar exercício" }),
    ).toHaveAttribute("href", "/exercicios/e1/editar");
    view.rerender(app("edit"));
    const name = await screen.findByLabelText("Nome do exercício *");
    expect(name).toHaveValue("Movimento teste");
    expect(screen.getByLabelText("Descrição")).toHaveValue(
      "Descrição preservada",
    );
    expect(screen.getByLabelText("Padrão de movimento")).toHaveValue("Agachar");
    expect(screen.getByLabelText("Músculos secundários")).toHaveValue([
      "muscle-2",
    ]);
    expect(
      screen.getByRole("button", { name: "Salvar como revisado" }),
    ).toBeDisabled();
    await user.clear(name);
    await user.type(name, "Movimento corrigido");
    await user.click(
      screen.getByRole("checkbox", { name: /Conferi as instruções/ }),
    );
    push.mockClear();
    await user.click(
      screen.getByRole("button", { name: "Salvar como revisado" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/exercicios"));
    expect(saved).toMatchObject({
      id: "e1",
      name: "Movimento corrigido",
      review_status: "reviewed",
      description: "Descrição preservada",
      secondary_muscles: ["muscle-2"],
      instructions: { revisionContext: "preservar" },
    });
    const writes = fetcher.mock.calls.filter(
      ([, init]) =>
        init?.method === "POST" && String(init.body).includes("tracking_type"),
    );
    expect(writes).toHaveLength(1);
    const patches = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patches).toHaveLength(1);
    expect(String(patches[0][0])).toContain("/api/workouts/exercises/e1/");
    expect(new Headers(patches[0][1]?.headers).get("X-Tenant-ID")).toBe("t1");
    expect(
      fetcher.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith("/exercises/e1/") && !init?.method,
      ),
    ).toBe(true);
    view.rerender(app("library"));
    expect(
      await screen.findByRole("button", { name: /Movimento corrigido/ }),
    ).toHaveTextContent("Revisado");
  });

  it("reabre alterações demo durante a sessão sem enviá-las à API ou misturar academias", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    function DemoJourney({ edit }: { edit: boolean }) {
      const { context, repository, setTenantId, saveExercise, logout } =
        useAppContext();
      return (
        <>
          <button
            onClick={() => {
              void saveExercise(
                {
                  name: "Rascunho temporário",
                  description: "",
                  movement_pattern: "",
                  instructions: {},
                  tracking_type: "duration",
                  review_status: "draft",
                  equipment: [],
                  primary_muscles: ["Quadríceps"],
                  secondary_muscles: [],
                },
                "00000000-0000-4000-8000-000000000301",
              );
            }}
          >
            Salvar exemplo
          </button>
          <button
            onClick={() => setTenantId("00000000-0000-4000-8000-000000000102")}
          >
            Outra academia
          </button>
          <button
            onClick={() => {
              void logout();
            }}
          >
            Sair do exemplo
          </button>
          {edit ? (
            <AppShell>
              <ExerciseEditor exerciseId="00000000-0000-4000-8000-000000000301" />
            </AppShell>
          ) : (
            <p>
              {repository
                .getExercises(context)
                .map((item) => item.name)
                .join(", ")}
            </p>
          )}
        </>
      );
    }
    const user = userEvent.setup();
    const view = render(
      <DemoProvider mode="demo">
        <DemoJourney edit={false} />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Salvar exemplo" }));
    view.rerender(
      <DemoProvider mode="demo">
        <DemoJourney edit />
      </DemoProvider>,
    );
    expect(await screen.findByLabelText("Nome do exercício *")).toHaveValue(
      "Rascunho temporário",
    );
    view.rerender(
      <DemoProvider mode="demo">
        <DemoJourney edit={false} />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Outra academia" }));
    expect(screen.queryByText("Rascunho temporário")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sair do exemplo" }));
    expect(screen.getByText("Agachamento com halter")).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
