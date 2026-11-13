import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "./auth-context";
import { ProtocolsConsole } from "./protocols-console";
import {
  platformApi,
  type MeasurementProtocolRecord,
  type PlatformMembership,
} from "@/lib/platform-api";

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

const protocol: MeasurementProtocolRecord = {
  id: "protocol-id",
  name: "Perímetros",
  version: "1",
  method: "circumference",
  sites: ["Cintura"],
  equation_metadata: {},
  is_active: false,
};

describe("ProtocolsConsole", () => {
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

  it("lists inactive protocols and activates the selected one", async () => {
    vi.spyOn(platformApi, "measurementProtocols").mockResolvedValue([protocol]);
    const save = vi.spyOn(platformApi, "saveMeasurementProtocol").mockResolvedValue({
      ...protocol,
      is_active: true,
    });

    render(<ProtocolsConsole />);

    expect(await screen.findByRole("button", { name: "Ativar" })).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ativar" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Perímetros", is_active: true }),
        "protocol-id",
      ),
    );
  });

  it("creates a protocol for the selected academy", async () => {
    vi.spyOn(platformApi, "measurementProtocols").mockResolvedValue([]);
    const save = vi.spyOn(platformApi, "saveMeasurementProtocol").mockResolvedValue({
      ...protocol,
      is_active: true,
    });

    render(<ProtocolsConsole />);
    await screen.findByText("Nenhum protocolo cadastrado.");
    await userEvent.click(screen.getByRole("button", { name: "Novo" }));

    await userEvent.type(screen.getByLabelText("Protocolo"), "Dobras");
    await userEvent.selectOptions(screen.getByLabelText("Método"), "skinfold");
    await userEvent.type(screen.getByLabelText("Sítios anatômicos"), "Tríceps\nAbdominal");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        {
          name: "Dobras",
          version: "1",
          method: "skinfold",
          sites: ["Tríceps", "Abdominal"],
          equation_metadata: {},
          is_active: true,
        },
        undefined,
      ),
    );
  });
});
