import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { platformApi, type PlatformMembership } from "@/lib/platform-api";
import type { ProviderConfiguration } from "@/lib/billing";

import { useAuth } from "./auth-context";
import { ProviderConfigPanel } from "./provider-config-panel";

vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));

const staff = (capabilities: PlatformMembership["capabilities"]): PlatformMembership => ({
  id: "operator",
  email: "operator@example.com",
  name: "Operator",
  role: "staff",
  capabilities,
  is_active: true,
  mfa_enabled: true,
});

const configuration: ProviderConfiguration = {
  id: "provider-1",
  provider_code: "asaas",
  environment: "sandbox",
  is_active: true,
  is_default: true,
  api_key_configured: true,
  webhook_configured: true,
  fiscal_enabled: false,
  fiscal_settings: {},
  capabilities: { hosted_checkout: true },
  validation_status: "valid",
  validation_error_code: "",
  last_checked_at: "2026-11-11T12:00:00Z",
  credential_revision: 2,
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-11T12:00:00Z",
};

describe("ProviderConfigPanel", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: staff(["integrations.manage"]),
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
  });

  it("hides the credential form without integrations.manage", () => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: staff([]),
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
    render(<ProviderConfigPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("integrations.manage");
    expect(screen.queryByLabelText("Substituir chave da API")).not.toBeInTheDocument();
  });

  it("shows that a secret exists and does not send a mask or a blank replacement", async () => {
    vi.spyOn(platformApi, "providerConfigurations").mockResolvedValue([configuration]);
    const save = vi.spyOn(platformApi, "saveProviderConfiguration").mockResolvedValue(configuration);
    const user = userEvent.setup();
    render(<ProviderConfigPanel />);
    expect(await screen.findByText(/Chave da API: configurada/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar configuração" })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(/sk_|token|secret/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Salvar configuração" }));
    expect(save).toHaveBeenCalledWith(expect.not.objectContaining({ api_key: expect.anything() }), "provider-1");
    expect(screen.queryByRole("button", { name: "Salvar configuração" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const masked = screen.getByLabelText("Substituir chave da API");
    await user.type(masked, "****");
    await user.click(screen.getByRole("button", { name: "Salvar configuração" }));
    expect(save.mock.calls.at(-1)?.[0]).not.toHaveProperty("api_key");
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const secret = screen.getByLabelText("Substituir chave da API");
    await user.type(secret, "real-key");
    await user.click(screen.getByRole("button", { name: "Salvar configuração" }));
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({ api_key: "real-key" });
  });
});
