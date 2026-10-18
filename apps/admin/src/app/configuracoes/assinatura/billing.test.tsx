import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider, useAppContext } from "@/components/app-context";
import { apiClient, type ApiRole } from "@/lib/api-client";
import { BillingWorkspace } from "./page";
vi.mock("next/navigation", () => ({
  usePathname: () => "/configuracoes/assinatura",
}));
afterEach(() => {
  apiClient.clearSession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const page = (results: unknown[]) =>
  json({ count: results.length, results, next: null });
function mockApi(roles: ApiRole[]) {
  let portalCalls = 0;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = String(input);
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
          first_name: "Admin",
          last_name: "Teste",
          email: "a@example.test",
        },
      ]);
    if (url.endsWith("memberships/"))
      return page([
        {
          id: "m1",
          user: "u1",
          email: "a@example.test",
          status: "active",
          roles,
        },
      ]);
    if (url.endsWith("subscriptions/"))
      return page([
        {
          id: "sub",
          status: "cancel_scheduled",
          plan_detail: {
            id: "plan",
            name: "Plano da academia",
            price_reference: "",
            features: ["nutrition"],
            limits: { students: 100 },
          },
          billing_cycle: "monthly",
          current_period_start: null,
          current_period_end: "2026-11-17T12:00:00Z",
          grace_ends_at: null,
          cancel_at: "2026-11-17T12:00:00Z",
          billing_details: {},
        },
      ]);
    if (url.endsWith("invoices/"))
      return page([
        {
          id: "i1",
          status: "paid",
          currency: "BRL",
          amount_minor: 12500,
          due_at: "2026-10-17T12:00:00Z",
          hosted_url: "javascript:alert(1)",
        },
      ]);
    if (url.endsWith("entitlements/"))
      return page([
        { id: "e1", key: "nutrition", enabled: true, limit: 10, source: "contract" },
        { id: "e2", key: "exports", enabled: false, limit: null, source: "contract" },
      ]);
    if (url.endsWith("portal/")) {
      portalCalls++;
      return portalCalls === 1
        ? json({}, 400)
        : json({ url: "https://provider.example.test/portal" });
    }
    return page([]);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function Journey() {
  const app = useAppContext();
  return (
    <>
      <button onClick={() => void app.login("a@example.test", "password")}>
        Entrar
      </button>
      <BillingWorkspace />
    </>
  );
}
describe("academy billing", () => {
  it("hides billing actions and requests without billing.manage even for an authenticated administrator", async () => {
    const fetcher = mockApi(["admin"]);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText(/Cobrança restrita/);
    expect(
      screen.queryByRole("button", { name: /Gerenciar cobrança/ }),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/api/billing/")),
    ).toBe(false);
  });
  it("uses actual subscription and invoice data, rejects unsafe links, and handles provider failure", async () => {
    const fetcher = mockApi(["admin", "billing.manage"]);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("Cancelamento agendado");
    expect(screen.getByText(/nutrition · Habilitado · Limite: 10/)).toBeVisible();
    expect(screen.getByText(/exports · Desabilitado · Sem limite informado/)).toBeVisible();
    expect(screen.getByText(/R\$\s125,00/)).toBeVisible();
    expect(screen.getByText("Conforme contrato")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Abrir fatura no provedor" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cartão/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Gerenciar cobrança" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("API recusou");
    await user.click(
      screen.getByRole("button", { name: "Gerenciar cobrança" }),
    );
    const link = await screen.findByRole("link", {
      name: "Continuar no portal seguro do provedor",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://provider.example.test/portal",
    );
    const calls = fetcher.mock.calls.filter(([url]) =>
      String(url).endsWith("portal/"),
    );
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(new Headers(calls[0][1]?.headers).get("X-Tenant-ID")).toBe("t1");
  });
});
