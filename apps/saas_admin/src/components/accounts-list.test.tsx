import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountsList } from "./accounts-list";
import { useAuth } from "./auth-context";
import { platformApi, type PlatformAccount, type PlatformMembership } from "@/lib/platform-api";

vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));

const membership: PlatformMembership = {
  id: "operator-id",
  email: "operator@example.com",
  name: "Operator",
  role: "staff",
  capabilities: ["accounts.read"],
  is_active: true,
  mfa_enabled: true,
};

const account: PlatformAccount = {
  id: "account-id",
  name: "Academia Norte",
  legal_name: "Academia Norte Ltda",
  person_type: "legal_entity",
  tax_id: "**.***.***/****-90",
  profile: "gym",
  is_active: true,
  created_at: "2026-11-06T12:00:00Z",
  owners: [],
  memberships: [],
  units: [],
  subscription: null,
  entitlements: [],
  invoices: [],
  counts: { memberships: 0, units: 0, students: 0, professionals: 0 },
};

describe("AccountsList", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows the loading state while the request is pending", () => {
    vi.spyOn(platformApi, "accounts").mockReturnValue(new Promise(() => {}));
    render(<AccountsList />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando contas");
  });

  it("shows the empty state", async () => {
    vi.spyOn(platformApi, "accounts").mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<AccountsList />);
    expect(await screen.findByText("Nenhuma conta encontrada")).toBeInTheDocument();
  });

  it("shows API errors", async () => {
    vi.spyOn(platformApi, "accounts").mockRejectedValue(new Error("Serviço indisponível"));
    render(<AccountsList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço indisponível");
  });

  it("loads the next page", async () => {
    const request = vi.spyOn(platformApi, "accounts").mockResolvedValue({
      count: 11,
      next: "/next",
      previous: null,
      results: [account],
    });
    render(<AccountsList />);
    await screen.findByText("Academia Norte");

    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    await waitFor(() => expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 })));
  });

  it("blocks requests without the accounts capability", () => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: { ...membership, capabilities: [] },
      login: vi.fn(),
      logout: vi.fn(),
      refreshMembership: vi.fn(),
    });
    const request = vi.spyOn(platformApi, "accounts");
    render(<AccountsList />);
    expect(screen.getByRole("alert")).toHaveTextContent("Você não tem acesso");
    expect(request).not.toHaveBeenCalled();
  });
});
