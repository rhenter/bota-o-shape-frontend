import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider, useAppContext } from "@/components/app-context";
import { apiClient, type ApiRole } from "@/lib/api-client";
import { ChargesWorkspace } from "../cobrancas/page";
import { PlanWorkspace } from "../plano/page";
import { BillingWorkspace } from "./page";
vi.mock("next/navigation", () => ({
  usePathname: () => "/configuracoes/assinatura",
  useSearchParams: () => new URLSearchParams(window.location.search),
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
            features: { has_nutrition: true },
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
    if (url.endsWith("usage/"))
      return json({
        items: [{ key: "active_students", used: 2, limit: 100 }],
      });
    if (url.endsWith("capabilities/"))
      return json({
        provider: "asaas",
        capabilities: { hosted_checkout: true, fiscal_document: true },
      });
    if (url.endsWith("portal/")) {
      portalCalls++;
      return portalCalls === 1
        ? json({}, 400)
        : json({
            id: "op",
            status: "succeeded",
            result_data: { url: "https://provider.example.test/portal" },
          });
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
      <PlanWorkspace />
      <ChargesWorkspace />
      <BillingWorkspace />
    </>
  );
}
describe("academy billing", () => {
  it("hides billing actions and requests from a professional without billing access", async () => {
    const fetcher = mockApi(["coach"]);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findAllByText(/Cobrança restrita/)).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Abrir cobrança existente/ }),
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
    expect(screen.getByText("Alunos ativos")).toBeVisible();
    expect(screen.getByText("2 de 100")).toBeVisible();
    expect(screen.getByText(/exports · Desabilitado · Sem limite informado/)).toBeVisible();
    expect(screen.getByText(/R\$\s125,00/)).toBeVisible();
    expect(screen.getByText("Conforme contrato")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Abrir cobrança no provedor" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cartão/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Abrir cobrança existente" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("API recusou");
    await user.click(
      screen.getByRole("button", { name: "Abrir cobrança existente" }),
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
    const key = new Headers(calls[0][1]?.headers).get("Idempotency-Key");
    expect(key).toBeTruthy();
    expect(new Headers(calls[1][1]?.headers).get("Idempotency-Key")).toBe(key);
    expect(calls.every(([url]) => String(url).endsWith("portal/"))).toBe(true);
  });

  it("shows awaiting confirmation after checkout return until the API reports payment", async () => {
    window.history.pushState({}, "", "/configuracoes/assinatura?billing_return=1&status=RECEIVED");
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("auth/token/"))
        return json({
          access: `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`,
          refresh: "r",
        });
      if (url.endsWith("tenants/"))
        return page([{ id: "t1", name: "Academia", legal_name: "Academia", cnpj: null }]);
      if (url.endsWith("users/"))
        return page([{ id: "u1", first_name: "Admin", last_name: "Teste", email: "a@example.test" }]);
      if (url.endsWith("memberships/"))
        return page([{ id: "m1", user: "u1", email: "a@example.test", status: "active", roles: ["admin", "billing.manage"] }]);
      if (url.endsWith("subscriptions/"))
        return page([{
          id: "sub",
          status: "past_due",
          plan_detail: {
            id: "plan",
            version: 3,
            monthly_price_minor: 9900,
            currency: "BRL",
            price_reference: "",
            features: {},
            limits: {},
          },
          billing_cycle: "monthly",
          current_period_start: "2026-10-17T12:00:00Z",
          current_period_end: "2026-11-17T12:00:00Z",
          grace_ends_at: null,
          cancel_at: null,
          billing_details: {},
        }]);
      if (url.endsWith("invoices/"))
        return page([{
          id: "i1",
          status: "pending",
          currency: "BRL",
          amount_minor: 9900,
          due_at: "2026-11-17T12:00:00Z",
          hosted_url: "https://provider.example.test/charge",
          fiscal_document: {
            id: "nf",
            status: "authorized",
            number: "123",
            pdf_url: "https://provider.example.test/nf.pdf",
            xml_url: "",
            error_message: "",
          },
        }]);
      if (url.endsWith("entitlements/")) return page([]);
      if (url.endsWith("capabilities/"))
        return json({ provider: "asaas", capabilities: { hosted_checkout: true } });
      return page([]);
    });
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(/Aguardando confirmação do pagamento pela API/)).toBeVisible();
    expect(screen.queryByText(/Pagamento confirmado/)).not.toBeInTheDocument();
    expect(screen.getByText("Versão 3")).toBeVisible();
    expect(screen.getByRole("link", { name: "Abrir cobrança no provedor" })).toHaveAttribute(
      "href",
      "https://provider.example.test/charge",
    );
    expect(screen.getByRole("link", { name: "Abrir PDF da NFS-e" })).toHaveAttribute(
      "href",
      "https://provider.example.test/nf.pdf",
    );
    window.history.pushState({}, "", "/configuracoes/assinatura");
  });

  it("reuses the checkout key after a timeout and ignores a second click", async () => {
    let checkoutCalls = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("auth/token/"))
        return json({
          access: `header.${btoa(JSON.stringify({ user_id: "u1" }))}.signature`,
          refresh: "r",
        });
      if (url.endsWith("tenants/"))
        return page([{ id: "t1", name: "Academia", legal_name: "Academia", cnpj: null }]);
      if (url.endsWith("users/"))
        return page([{ id: "u1", first_name: "Admin", last_name: "Teste", email: "a@example.test" }]);
      if (url.endsWith("memberships/"))
        return page([{ id: "m1", user: "u1", email: "a@example.test", status: "active", roles: ["admin", "billing.manage"] }]);
      if (url.endsWith("subscriptions/"))
        return page([{
          id: "sub",
          status: "past_due",
          plan_detail: { id: "plan", name: "Plano", price_reference: "Contrato", features: {}, limits: {} },
          billing_cycle: "monthly",
          current_period_start: null,
          current_period_end: null,
          grace_ends_at: null,
          cancel_at: null,
          billing_details: {},
        }]);
      if (url.endsWith("invoices/") || url.endsWith("entitlements/")) return page([]);
      if (url.endsWith("capabilities/"))
        return json({ provider: "asaas", capabilities: { hosted_checkout: true } });
      if (url.endsWith("checkout/")) {
        checkoutCalls += 1;
        if (checkoutCalls === 1) {
          const error = new Error("timed out");
          error.name = "TimeoutError";
          throw error;
        }
        return json({
          id: "op",
          status: "succeeded",
          result_data: { url: "https://provider.example.test/checkout" },
        });
      }
      return page([]);
    });
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(
      <DemoProvider mode="api">
        <Journey />
      </DemoProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const button = await screen.findByRole("button", { name: "Abrir contratação segura" });
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("continua incerto");
    await user.click(button);
    const calls = fetcher.mock.calls.filter(([url]) => String(url).endsWith("checkout/"));
    await waitFor(() => expect(calls).toHaveLength(2));
    const first = new Headers(calls[0][1]?.headers).get("Idempotency-Key");
    expect(first).toBeTruthy();
    expect(new Headers(calls[1][1]?.headers).get("Idempotency-Key")).toBe(first);
    expect(calls.some(([url]) => String(url).includes("portal"))).toBe(false);
  });
});
