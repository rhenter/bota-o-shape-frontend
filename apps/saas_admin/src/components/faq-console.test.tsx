import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { platformApi, type ManagedFaq, type PlatformMembership } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { FaqConsole } from "./admin-sections";

vi.mock("./auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/platform-api", () => ({ platformApi: { faq: vi.fn(), saveFaq: vi.fn() } }));

const staff: PlatformMembership = {
  id: "operator",
  email: "operator@example.com",
  name: "Operator",
  role: "staff",
  capabilities: ["support.manage"],
  is_active: true,
  mfa_enabled: true,
};

const item: ManagedFaq = {
  id: "faq-1",
  question: "Como acessar?",
  answer: "Use seu e-mail.",
  category: "account",
  audience: "academy",
  locale: "pt-BR",
  sort_order: 2,
  is_published: true,
  updated_at: "2026-11-01T12:00:00Z",
};

describe("FaqConsole", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      ready: true,
      membership: staff,
      logout: vi.fn(),
    } as ReturnType<typeof useAuth>);
    vi.mocked(platformApi.faq).mockResolvedValue([item]);
    vi.mocked(platformApi.saveFaq).mockResolvedValue(item);
  });

  it("lists questions and opens the editor only from Nova pergunta or Editar", async () => {
    const user = userEvent.setup();
    render(<FaqConsole />);

    expect(await screen.findByText("Como acessar?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova pergunta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar pergunta" })).not.toBeInTheDocument();
    expect(screen.getByText("Academia · Português · Publicada · Ordem 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: "Editar pergunta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pergunta")).toHaveValue("Como acessar?");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Nova pergunta" }));
    expect(screen.getByRole("heading", { name: "Nova pergunta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pergunta")).toHaveValue("");

    await user.type(screen.getByLabelText("Pergunta"), "Quanto custa?");
    await user.type(screen.getByLabelText("Resposta"), "Conforme o plano.");
    await user.click(screen.getByRole("button", { name: "Salvar pergunta" }));

    await waitFor(() =>
      expect(platformApi.saveFaq).toHaveBeenCalledWith(
        null,
        expect.objectContaining({ question: "Quanto custa?", answer: "Conforme o plano." }),
      ),
    );
  });
});
