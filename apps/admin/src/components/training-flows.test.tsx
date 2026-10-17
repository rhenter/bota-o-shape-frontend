import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  type ApiAssessment,
  type ApiWorkoutTemplate,
} from "@/lib/api-client";
import { DemoProvider, useAppContext } from "./app-context";
import { WorkoutEditor } from "./workouts/workout-editor";
import NewAssessmentPage from "@/app/avaliacoes/nova/page";
import { AssessmentReport } from "./assessments/assessment-report";
vi.mock("next/navigation", () => ({ usePathname: () => "/treinos" }));
afterEach(() => {
  apiClient.clearSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const page = (results: unknown[]) =>
  json({ count: results.length, next: null, results });
function Journey({ step }: { step: "workout" | "collect" | "report" }) {
  const { login } = useAppContext();
  return (
    <>
      <button
        onClick={() => {
          void login("admin@example.test", "password");
        }}
      >
        Entrar
      </button>
      {step === "workout" ? (
        <WorkoutEditor />
      ) : step === "collect" ? (
        <NewAssessmentPage />
      ) : (
        <AssessmentReport assessmentId="assessment-1" />
      )}
    </>
  );
}
function mockApi() {
  let template: ApiWorkoutTemplate | undefined;
  let assessment: ApiAssessment | undefined;
  let failPublish = true;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input, init) => {
      const url = String(input),
        method = init?.method ?? "GET";
      if (url.endsWith("auth/token/"))
        return json({
          access: `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`,
          refresh: "refresh",
        });
      if (url.endsWith("tenants/"))
        return page([
          { id: "t1", name: "Academia A", legal_name: "A", cnpj: null },
        ]);
      if (url.endsWith("users/"))
        return page([
          {
            id: "u1",
            first_name: "Admin",
            last_name: "",
            email: "admin@example.test",
          },
          {
            id: "s1",
            first_name: "Aluno",
            last_name: "Teste",
            email: "student@example.test",
          },
        ]);
      if (url.endsWith("memberships/"))
        return page([
          {
            id: "m1",
            user: "u1",
            email: "admin@example.test",
            status: "active",
            roles: ["admin"],
          },
          {
            id: "m2",
            user: "s1",
            email: "student@example.test",
            status: "active",
            roles: ["student"],
          },
        ]);
      if (url.endsWith("exercises/"))
        return page([
          {
            id: "e1",
            name: "Exercício revisado",
            description: "",
            instructions: { steps: ["Instrução permanente"] },
            movement_pattern: "",
            tracking_type: "load_reps",
            review_status: "reviewed",
            equipment: [],
            primary_muscles: [],
            secondary_muscles: [],
          },
        ]);
      if (url.endsWith("templates/")) {
        if (method === "POST") {
          template = {
            ...JSON.parse(String(init?.body)),
            id: "template-1",
            version: 1,
            status: "draft",
            supersedes: null,
            published_at: null,
          };
          return json(template, 201);
        }
        return page(template ? [template] : []);
      }
      if (url.endsWith("templates/template-1/")) {
        template = { ...template!, ...JSON.parse(String(init?.body)) };
        return json(template);
      }
      if (url.endsWith("publish/")) {
        if (failPublish) {
          failPublish = false;
          return json({}, 403);
        }
        template = {
          ...template!,
          status: "published",
          published_at: "2026-10-17T12:00:00Z",
        };
        return json(template);
      }
      if (url.endsWith("protocols/"))
        return page([
          {
            id: "p1",
            name: "Perímetros",
            version: "1",
            method: "circumference",
            sites: ["Cintura"],
            equation_metadata: {},
            is_active: true,
          },
        ]);
      if (url.endsWith("consents/"))
        return page([
          {
            id: "c1",
            subject: "s1",
            purpose: "Avaliação física",
            granted: true,
            granted_at: "2026-10-17T12:00:00Z",
            revoked_at: null,
            evidence: {},
          },
        ]);
      if (url.endsWith("assessments/assessments/")) {
        if (method === "POST") {
          const data = JSON.parse(String(init?.body));
          assessment = {
            ...data,
            measurements: data.measurements.map((m: object) => ({
              ...m,
              id: "measurement-1",
              possible_error: true,
            })),
            id: "assessment-1",
            status: "draft",
            released_at: null,
          };
          return json(assessment, 201);
        }
        return page(assessment ? [assessment] : []);
      }
      if (url.endsWith("transition/")) {
        const { status } = JSON.parse(String(init?.body));
        assessment = {
          ...assessment!,
          status,
          released_at: status === "released" ? "2026-10-17T12:00:00Z" : null,
        };
        return json(assessment);
      }
      if (url.endsWith("report/"))
        return json({
          id: "report-1",
          assessment: "assessment-1",
          comparisons: [
            {
              measurement_id: "measurement-1",
              comparison_status: "not_comparable",
            },
          ],
          professional_interpretation: "",
          released_to_student: true,
        });
      return page([]);
    });
  vi.stubGlobal("fetch", fetcher);
  return {
    fetcher,
    getTemplate: () => template,
    getAssessment: () => assessment,
  };
}

describe("fluxos reais de treinos e avaliações", () => {
  it("preserva o rascunho quando a publicação falha e não repete o POST de criação", async () => {
    const { fetcher, getTemplate } = mockApi();
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey step="workout" />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.type(
      await screen.findByLabelText("Nome do modelo *"),
      "Treino API",
    );
    await user.click(
      screen.getByRole("button", { name: "Adicionar exercício" }),
    );
    await user.type(
      screen.getByLabelText("Observação do professor"),
      "Orientação exclusiva",
    );
    await user.click(screen.getByRole("button", { name: "Publicar versão 1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("permissão");
    expect(getTemplate()?.status).toBe("draft");
    expect(screen.getByLabelText("Observação do professor")).toBeDisabled();
    expect(
      screen.getByText(/Os dias, exercícios e séries deste rascunho/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Publicar versão 1" }));
    await waitFor(() => expect(getTemplate()?.status).toBe("published"));
    expect(
      await screen.findByRole("heading", { name: "Versão publicada" }),
    ).toBeVisible();
    const creates = fetcher.mock.calls.filter(
      ([url, init]) =>
        String(url).endsWith("templates/") && init?.method === "POST",
    );
    expect(creates).toHaveLength(1);
    const patches = fetcher.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0][1]?.body))).not.toHaveProperty("days");
    const create = JSON.parse(String(creates[0][1]?.body));
    expect(create.days[0].exercises[0].coach_observation).toBe(
      "Orientação exclusiva",
    );
    expect(create.days[0].exercises[0]).not.toHaveProperty("student_note");
    expect(new Headers(creates[0][1]?.headers).get("X-Tenant-ID")).toBe("t1");
  });

  it("registra valor fora da faixa com consentimento e só libera pela sequência real da API", async () => {
    const { fetcher, getAssessment } = mockApi();
    const user = userEvent.setup();
    const app = (step: "collect" | "report") => (
      <DemoProvider mode="api">
        <Journey step={step} />
      </DemoProvider>
    );
    const view = render(app("collect"));
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.selectOptions(await screen.findByLabelText("Aluno *"), "s1");
    await user.selectOptions(
      screen.getByLabelText("Protocolo de avaliação *"),
      "p1",
    );
    await user.selectOptions(
      screen.getByLabelText("Consentimento registrado *"),
      "c1",
    );
    await user.type(
      screen.getByLabelText("Data e hora da avaliação *"),
      "2026-10-17T09:30",
    );
    await user.type(screen.getByLabelText("Métrica *"), "Cintura");
    await user.type(screen.getByLabelText("Valor *"), "10001");
    await user.type(screen.getByLabelText("Unidade *"), "cm");
    await user.type(screen.getByLabelText("Ponto anatômico *"), "Ponto médio");
    expect(screen.getByRole("status")).toHaveTextContent(
      "o registro continua permitido",
    );
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(
      await screen.findByRole("heading", {
        name: "Avaliação salva como rascunho",
      }),
    ).toBeVisible();
    expect(getAssessment()).toMatchObject({
      student: "s1",
      consent: "c1",
      status: "draft",
      measurements: [
        {
          raw_value: "10001",
          unit: "cm",
          method: "circumference",
          protocol: "p1",
          anatomical_site: "Ponto médio",
        },
      ],
    });
    view.rerender(app("report"));
    await screen.findByRole("heading", { name: "Resultado da avaliação" });
    for (const label of [
      "Marcar como revisada",
      "Concluir avaliação",
      "Liberar para o aluno",
    ]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toBeDisabled();
      await user.click(
        screen.getByRole("checkbox", {
          name: "Conferi os dados e desejo continuar.",
        }),
      );
      await user.click(button);
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: label }),
        ).not.toBeInTheDocument(),
      );
    }
    await waitFor(() => expect(getAssessment()?.status).toBe("released"));
    const transitions = fetcher.mock.calls.filter(([url]) =>
      String(url).endsWith("transition/"),
    );
    expect(
      transitions.map(([, init]) => JSON.parse(String(init?.body)).status),
    ).toEqual(["reviewed", "completed", "released"]);
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) =>
          String(url).endsWith("assessments/assessment-1/report/"),
        ),
      ).toBe(true),
    );
    expect(screen.getByText("Sem comparação direta")).toBeVisible();
  });
});
