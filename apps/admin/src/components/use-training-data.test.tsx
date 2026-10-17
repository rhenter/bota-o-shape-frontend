import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { DemoProvider } from "./app-context";
import { useTrainingData } from "./use-training-data";
import { demoIds } from "@/lib/demo-repository";
afterEach(() => vi.unstubAllGlobals());
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
