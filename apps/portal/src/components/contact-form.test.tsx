import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitContact } from "@/lib/api";
import { ContactForm } from "./contact-form";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  submitContact: vi.fn(),
}));
const mockedSubmitContact = vi.mocked(submitContact);

describe("ContactForm", () => {
  beforeEach(() => mockedSubmitContact.mockReset());

  it("requires consent and shows success after submission", async () => {
    mockedSubmitContact.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Mensagem"), "Quero conhecer.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Mensagem enviada");
    expect(mockedSubmitContact.mock.calls[0][0]).toEqual(expect.objectContaining({ consent: true }));
  });

  it("shows API errors and restores the submit action", async () => {
    mockedSubmitContact.mockResolvedValue({ fields: {}, general: ["Serviço indisponível."] });
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Mensagem"), "Olá");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço indisponível.");
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });
});
