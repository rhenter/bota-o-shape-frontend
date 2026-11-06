import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerOwner } from "@/lib/api";
import { SignupForm } from "./signup-form";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, registerOwner: vi.fn() };
});

const mockedRegisterOwner = vi.mocked(registerOwner);

describe("SignupForm", () => {
  beforeEach(() => {
    mockedRegisterOwner.mockReset();
    mockedRegisterOwner.mockResolvedValue({ fields: { tax_id: ["CPF inválido."] }, general: [] });
  });

  it("switches to an individual professional and sends a normalized CPF", async () => {
    const user = userEvent.setup();
    render(<SignupForm planCode="pro" />);

    await user.click(screen.getByRole("radio", { name: "Pessoa física (CPF)" }));
    expect(screen.getByLabelText("Nome profissional")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Perfil"), "personal_trainer");
    await user.type(screen.getByLabelText("Nome profissional"), "Ana Treinadora");
    await user.type(screen.getByLabelText("CPF"), "52998224725");
    await user.type(screen.getByLabelText("Responsável"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "safe-password-123");
    expect(screen.getByLabelText("CPF")).toHaveValue("529.982.247-25");

    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(mockedRegisterOwner).toHaveBeenCalledOnce());
    expect(mockedRegisterOwner).toHaveBeenCalledWith({
      tenant_name: "Ana Treinadora",
      person_type: "individual",
      tax_id: "52998224725",
      profile: "personal_trainer",
      first_name: "Ana",
      last_name: "",
      email: "ana@example.com",
      password: "safe-password-123",
      plan_code: "pro",
    });
    expect(await screen.findByText("CPF inválido.")).toHaveAttribute("id", "tax_id-error");
    expect(screen.getByRole("textbox", { name: /CPF/ })).toHaveAttribute(
      "aria-describedby",
      "tax_id-error",
    );
  });

  it("starts with the academy and CNPJ fields", () => {
    render(<SignupForm />);

    expect(screen.getByRole("radio", { name: "Pessoa jurídica (CNPJ)" })).toBeChecked();
    expect(screen.getByLabelText("Nome da academia ou negócio")).toBeInTheDocument();
    expect(screen.getByLabelText("CNPJ")).toBeRequired();
  });
});
