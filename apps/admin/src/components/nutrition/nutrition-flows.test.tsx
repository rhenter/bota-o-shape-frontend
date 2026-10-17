import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider, useAppContext } from "../app-context";
import { useAdminData } from "../use-admin-data";
import { MealPlanEditor } from "./meal-plan-editor";
import { apiClient, type ApiMealPlan, type ApiRole } from "@/lib/api-client";
vi.mock("next/navigation", () => ({ usePathname: () => "/nutricao" }));
afterEach(() => {
  apiClient.clearSession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const page = (results: unknown[]) =>
  json({ count: results.length, results, next: null });
function mockApi({
  roles = ["admin", "dietitian"],
  consent = true,
  assigned = true,
  verified = true,
  existingPlan,
}: {
  roles?: ApiRole[];
  consent?: boolean;
  assigned?: boolean;
  verified?: boolean;
  existingPlan?: ApiMealPlan;
} = {}) {
  let plan: ApiMealPlan | undefined = existingPlan;
  let failPublish = true;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input),
        method = init?.method ?? "GET";
      if (url.endsWith("auth/token/"))
        return json({
          access: `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`,
          refresh: "r",
        });
      if (url.endsWith("tenants/"))
        return page([
          { id: "t1", name: "Academia", legal_name: "Academia", cnpj: null },
        ]);
      if (url.endsWith("users/"))
        return page([
          {
            id: "u1",
            first_name: "Nutri",
            last_name: "Teste",
            email: "n@example.test",
          },
          {
            id: "s1",
            first_name: "Aluno",
            last_name: "Teste",
            email: "s@example.test",
          },
        ]);
      if (url.endsWith("memberships/"))
        return page([
          {
            id: "m1",
            user: "u1",
            email: "n@example.test",
            status: "active",
            roles,
          },
          {
            id: "m2",
            user: "s1",
            email: "s@example.test",
            status: "active",
            roles: ["student"],
          },
        ]);
      if (url.endsWith("credentials/"))
        return page([
          {
            id: "c1",
            professional: "u1",
            kind: "crn",
            registration_number: "123",
            state: "SP",
            verified_at: verified ? "2026-10-17T10:00:00Z" : null,
          },
        ]);
      if (url.endsWith("dietitian-assignments/"))
        return page(
          assigned
            ? [{ id: "a1", dietitian: "u1", student: "s1", is_active: true }]
            : [],
        );
      if (url.endsWith("consents/"))
        return page(
          consent
            ? [
                {
                  id: "consent",
                  subject: "s1",
                  purpose: "nutrition_plan",
                  granted: true,
                  revoked_at: null,
                },
              ]
            : [],
        );
      if (url.endsWith("food/foods/"))
        return page([
          {
            id: "f1",
            name: "Arroz",
            preparation_state: "Cozido",
            source: {
              id: "src",
              kind: "tbca",
              name: "TBCA",
              version: "2023",
              is_active: true,
            },
            household_measures: [],
          },
        ]);
      if (url.endsWith("nutrition/plans/")) {
        if (method === "POST") {
          const body = JSON.parse(String(init?.body));
          plan = {
            ...body,
            id: "plan-1",
            status: "draft",
            versions: [
              {
                ...body.draft,
                id: "v1",
                version: 1,
                crn: "123",
                crn_state: "SP",
                published_at: null,
              },
            ],
          };
          return json(plan, 201);
        }
        return page(plan ? [plan] : []);
      }
      if (url.endsWith("publish/")) {
        if (failPublish) {
          failPublish = false;
          return json({}, 403);
        }
        plan = {
          ...plan!,
          status: "published",
          versions: plan!.versions.map((v) => ({
            ...v,
            published_at: "2026-10-17T12:00:00Z",
          })),
        };
        return json(plan);
      }
      if (url.endsWith("revise/")) {
        const version = {
          ...JSON.parse(String(init?.body)),
          id: "v2",
          version: 2,
          crn: "123",
          crn_state: "SP",
          published_at: null,
        };
        plan = { ...plan!, versions: [...plan!.versions, version] };
        return json(version, 201);
      }
      if (url.endsWith("calculate/"))
        return json({
          food_id: "f1",
          description: "Arroz",
          grams: "100",
          source: "tbca",
          source_version: "2023",
          nutrients: {
            energy_kcal: {
              name: "Energia",
              value: "120",
              unit: "kcal",
              per_100g: "120",
            },
          },
        });
      return page([]);
    });
  vi.stubGlobal("fetch", fetcher);
  return { fetcher, getPlan: () => plan };
}
function Journey({
  inspect = false,
  planId,
}: {
  inspect?: boolean;
  planId?: string;
}) {
  const app = useAppContext();
  return (
    <>
      <button onClick={() => void app.login("n@example.test", "password")}>
        Entrar
      </button>
      {inspect ? <ScopeProbe /> : <MealPlanEditor planId={planId} />}
    </>
  );
}
function ScopeProbe() {
  const app = useAdminData(true);
  return <p>{app.scopeError || "Pronto"}</p>;
}
describe("nutrition API integration", () => {
  it.each([{ consent: false }, { assigned: false }])(
    "blocks publication of an existing draft without assignment or consent: %j",
    async (options) => {
      const existingPlan: ApiMealPlan = {
        id: "existing",
        student: "s1",
        objective: "Rotina",
        starts_on: "2026-10-17",
        ends_on: null,
        review_on: null,
        status: "draft",
        versions: [
          {
            id: "v1",
            version: 1,
            crn: "123",
            crn_state: "SP",
            published_at: null,
            change_reason: "Plano inicial",
            hydration_guidance: "",
            complementary_guidance: "",
            meal_slots: [
              {
                day: 1,
                name: "Almoço",
                scheduled_time: null,
                order: 1,
                instructions: "",
                foods: [
                  {
                    description: "Preparação declarada",
                    unit: "porção",
                    quantity: "1",
                    preparation: "",
                    observation: "",
                    substitutions: [],
                  },
                ],
              },
            ],
          },
        ],
      };
      const { fetcher } = mockApi({ ...options, existingPlan });
      const user = userEvent.setup();
      render(
        <DemoProvider mode="api">
          <Journey planId="existing" />
        </DemoProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Entrar" }));
      const publish = await screen.findByRole("button", {
        name: "Publicar e atribuir ao aluno",
      });
      await user.click(
        screen.getByRole("checkbox", { name: /Conferi alergias/ }),
      );
      expect(publish).toBeDisabled();
      await user.click(publish);
      expect(
        fetcher.mock.calls.some(([url]) => String(url).endsWith("publish/")),
      ).toBe(false);
    },
  );

  it("saves once, preserves a rejected publication, and appends a revision", async () => {
    const { fetcher, getPlan } = mockApi();
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.selectOptions(await screen.findByLabelText("Aluno *"), "s1");
    await user.type(screen.getByLabelText("Objetivo *"), "Rotina");
    await user.type(screen.getByLabelText("Início *"), "2026-10-17");
    await user.type(
      screen.getByLabelText("Resumo da alteração *"),
      "Plano inicial",
    );
    await user.click(
      screen.getByRole("button", { name: "Adicionar refeição" }),
    );
    await user.click(screen.getByRole("button", { name: "Adicionar Arroz" }));
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    const publish = await screen.findByRole("button", {
      name: "Publicar e atribuir ao aluno",
    });
    expect(publish).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: /Conferi alergias/ }),
    );
    await user.click(publish);
    expect(await screen.findByRole("alert")).toHaveTextContent("permissão");
    expect(getPlan()?.status).toBe("draft");
    await user.click(publish);
    await screen.findByRole("button", { name: "Criar nova versão" });
    expect(getPlan()?.status).toBe("published");
    await user.click(screen.getByRole("button", { name: "Criar nova versão" }));
    await user.type(
      screen.getByLabelText("Resumo da alteração *"),
      "Nova rotina",
    );
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(getPlan()?.versions).toHaveLength(2));
    expect(getPlan()?.versions[0].published_at).not.toBeNull();
    const creates = fetcher.mock.calls.filter(
      ([url, init]) =>
        String(url).endsWith("nutrition/plans/") && init?.method === "POST",
    );
    expect(creates).toHaveLength(1);
    expect(new Headers(creates[0][1]?.headers).get("X-Tenant-ID")).toBe("t1");
    expect(JSON.parse(String(creates[0][1]?.body))).not.toHaveProperty(
      "author",
    );
  });
  it.each([{ consent: false }, { assigned: false }])(
    "blocks authoring without safe student scope: %j",
    async (options) => {
      const { fetcher } = mockApi(options);
      const user = userEvent.setup();
      render(
        <DemoProvider mode="api">
          <Journey />
        </DemoProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Entrar" }));
      await user.selectOptions(await screen.findByLabelText("Aluno *"), "s1");
      expect(
        screen.getByRole("button", { name: "Adicionar refeição" }),
      ).toBeDisabled();
      expect(
        fetcher.mock.calls.some(
          ([, init]) =>
            init?.method === "POST" && String(init.body).includes("meal_slots"),
        ),
      ).toBe(false);
    },
  );
  it.each([{ roles: ["admin"] as ApiRole[] }, { verified: false }])(
    "does not expose authoring without verified role and credential: %j",
    async (options) => {
      mockApi(options);
      const user = userEvent.setup();
      render(
        <DemoProvider mode="api">
          <Journey />
        </DemoProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Entrar" }));
      await screen.findByText(/Administrador sozinho não pode publicar/);
      expect(screen.queryByLabelText("Aluno *")).not.toBeInTheDocument();
    },
  );
  it("does not request tenant-wide nutrition records for a non-admin dietitian", async () => {
    const { fetcher } = mockApi({ roles: ["dietitian"] });
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey inspect />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText(/Dados de alunos permanecem bloqueados/);
    expect(
      fetcher.mock.calls.some(([url]) =>
        /nutrition\/plans|consents|dietitian-assignments|credentials/.test(
          String(url),
        ),
      ),
    ).toBe(false);
  });
});
