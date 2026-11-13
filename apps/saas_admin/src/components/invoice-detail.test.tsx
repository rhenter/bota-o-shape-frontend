import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlatformInvoiceDetail } from "@/lib/billing";
import { PlatformApiError, platformApi, type PlatformMembership } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { InvoiceDetail } from "./invoice-detail";

vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));

const membership = (capabilities: PlatformMembership["capabilities"]): PlatformMembership => ({
  id: "operator",
  email: "operator@example.com",
  name: "Operator",
  role: "staff",
  capabilities,
  is_active: true,
  mfa_enabled: true,
});

const invoice: PlatformInvoiceDetail = {
  id: "invoice-1",
  subscription: "sub",
  provider_configuration: "provider",
  external_id: "pay_1",
  status: "paid",
  currency: "BRL",
  amount_minor: 1000,
  amount_paid_minor: 1000,
  amount_refunded_minor: 600,
  fee_minor: 50,
  net_minor: 950,
  payment_method: "PIX",
  provider_status: "RECEIVED",
  due_at: null,
  paid_at: "2026-11-01T12:00:00Z",
  available_at: null,
  hosted_url: "https://provider.example.test/charge",
  metadata: {},
  fiscal_document: {
    id: "nf",
    status: "error",
    external_id: "inv_1",
    number: "",
    pdf_url: "",
    xml_url: "",
    error_message: "Município rejeitou o serviço.",
    last_checked_at: null,
  },
  tenant_id: "tenant",
  tenant_name: "Academia Norte",
  subscription_id: "sub",
  movements: [
    {
      id: "mov",
      movement_type: "payment",
      external_id: "pay_1",
      state: "RECEIVED",
      amount_minor: 1000,
      currency: "BRL",
      occurred_at: null,
      provider_updated_at: null,
      first_observed_at: null,
      last_observed_at: null,
    },
  ],
};

describe("InvoiceDetail", () => {
  beforeEach(() => {
    vi.spyOn(platformApi, "platformInvoice").mockResolvedValue(invoice);
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: membership(["charges.read", "billing.manage"]),
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders the charge and the fiscal failure separately", async () => {
    render(<InvoiceDetail invoiceId="invoice-1" />);
    expect(await screen.findByText("Academia Norte")).toBeVisible();
    expect(screen.getByText("Município rejeitou o serviço.")).toBeVisible();
    expect(screen.getByText("payment")).toBeVisible();
    expect(screen.getByRole("link", { name: "Abrir cobrança no provedor" })).toBeVisible();
  });

  it("hides financial actions without billing.manage", async () => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: membership(["charges.read"]),
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
    render(<InvoiceDetail invoiceId="invoice-1" />);
    expect(await screen.findByText(/billing.manage/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Estornar" })).not.toBeInTheDocument();
  });

  it("blocks an invalid partial refund before calling the API", async () => {
    const refund = vi.spyOn(platformApi, "refundInvoice");
    const user = userEvent.setup();
    render(<InvoiceDetail invoiceId="invoice-1" />);
    await screen.findByText("Academia Norte");
    await user.type(screen.getByLabelText("Estorno parcial em centavos"), "500");
    await user.type(screen.getByLabelText("Justificativa"), "Estorno parcial aprovado.");
    await user.click(screen.getByRole("button", { name: "Estornar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("saldo residual");
    expect(refund).not.toHaveBeenCalled();
  });

  it("reuses the idempotency key after a timeout and on a double click", async () => {
    const refund = vi
      .spyOn(platformApi, "refundInvoice")
      .mockRejectedValueOnce(Object.assign(new PlatformApiError(0, "incerto"), { uncertain: true }))
      .mockResolvedValue({
        id: "op",
        operation_type: "refund_invoice",
        status: "succeeded",
        invoice_id: "invoice-1",
        subscription_id: "sub",
        amount_minor: 400,
        currency: "BRL",
        external_reference: "",
        result_data: {},
        error_message: "",
        correlation_id: "c",
        sent_at: null,
        last_checked_at: null,
        created_at: "2026-11-11T12:00:00Z",
      });
    const user = userEvent.setup();
    render(<InvoiceDetail invoiceId="invoice-1" />);
    await screen.findByText("Academia Norte");
    await user.type(screen.getByLabelText("Estorno parcial em centavos"), "400");
    await user.type(screen.getByLabelText("Justificativa"), "Estorno parcial aprovado.");
    const button = screen.getByRole("button", { name: "Estornar" });
    await user.click(button);
    expect(await screen.findByText("incerto")).toBeVisible();
    await user.click(button);
    expect(refund).toHaveBeenCalledTimes(2);
    expect(refund.mock.calls[0][2]).toBe(refund.mock.calls[1][2]);
    expect(refund.mock.calls[0][1]).toEqual({
      amount_minor: 400,
      reason: "Estorno parcial aprovado.",
    });
  });
});
