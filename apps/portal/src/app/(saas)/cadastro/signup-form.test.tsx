import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupPostalCode, registerOwner } from "@/lib/api";
import { SignupForm } from "./signup-form";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, registerOwner: vi.fn(), lookupPostalCode: vi.fn() };
});

const mockedRegisterOwner = vi.mocked(registerOwner);
const mockedLookupPostalCode = vi.mocked(lookupPostalCode);

describe("SignupForm", () => {
  beforeEach(() => {
    mockedRegisterOwner.mockReset();
    mockedLookupPostalCode.mockReset();
    mockedRegisterOwner.mockResolvedValue({ fields: { tax_id: ["CPF inválido."] }, general: [] });
  });

  it("switches to an individual professional and sends a normalized CPF", async () => {
    const user = userEvent.setup();
    render(<SignupForm planCode="pro" planName="Pro" />);

    await user.selectOptions(screen.getByLabelText("Perfil"), "personal_trainer");
    const identity = screen.getByRole("group", { name: "Identificação" });
    expect(identity).toHaveTextContent("O CREF é preenchido depois, no painel.");
    await user.type(within(identity).getByLabelText("Nome"), "Ana Treinadora");
    await user.type(within(identity).getByLabelText("CPF"), "52998224725");
    await user.type(within(screen.getByRole("group", { name: "Responsável" })).getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Senha"), "safe-password-123");
    await user.type(screen.getByLabelText("Confirmar senha"), "safe-password-123");
    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.type(screen.getByLabelText("Rua"), "Avenida Paulista");
    await user.type(screen.getByLabelText("Número"), "1000");
    await user.type(screen.getByLabelText("Bairro"), "Bela Vista");
    await user.type(screen.getByLabelText("Cidade"), "São Paulo");
    await user.type(screen.getByLabelText("UF"), "SP");
    expect(screen.getByLabelText("CPF")).toHaveValue("529.982.247-25");

    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(mockedRegisterOwner).toHaveBeenCalledOnce());
    expect(mockedRegisterOwner.mock.calls[0][0]).toEqual({
      tenant_name: "Ana Treinadora",
      person_type: "individual",
      tax_id: "52998224725",
      profile: "personal_trainer",
      first_name: "Ana",
      last_name: "",
      email: "ana@example.com",
      password: "safe-password-123",
      plan_code: "pro",
      services: [],
      address: {
        postal_code: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "",
        district: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
    });
    expect(await screen.findByText("CPF inválido.")).toHaveAttribute("id", "tax_id-error");
    expect(screen.getByRole("textbox", { name: /CPF/ })).toHaveAttribute(
      "aria-describedby",
      "tax_id-error",
    );
  });

  it("fills the street, district, city and state from the postal code", async () => {
    const user = userEvent.setup();
    mockedLookupPostalCode.mockResolvedValue({
      address: {
        postal_code: "01310100",
        street: "Avenida Paulista",
        district: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
    });
    render(<SignupForm planCode="pro" planName="Pro" />);

    await user.type(screen.getByLabelText("CEP"), "01310100");
    await user.click(screen.getByRole("button", { name: "Buscar CEP" }));

    expect(mockedLookupPostalCode).toHaveBeenCalledWith("01310100");
    expect(await screen.findByRole("status")).toHaveTextContent("Endereço preenchido");
    expect(screen.getByLabelText("Rua")).toHaveValue("Avenida Paulista");
    expect(screen.getByLabelText("Bairro")).toHaveValue("Bela Vista");
    expect(screen.getByLabelText("Cidade")).toHaveValue("São Paulo");
    expect(screen.getByLabelText("UF")).toHaveValue("SP");
  });

  it("starts with the academy trade name, CNPJ, legal name and address", () => {
    render(<SignupForm planCode="pro" planName="Pro" />);

    expect(screen.getByLabelText("Nome fantasia")).toBeRequired();
    expect(screen.getByLabelText("CNPJ")).toBeRequired();
    expect(screen.getByLabelText("Razão social")).toBeRequired();
    expect(screen.getByLabelText("Rua")).toBeRequired();
    expect(screen.queryByLabelText("CPF")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nome da unidade")).not.toBeInTheDocument();
  });
});
