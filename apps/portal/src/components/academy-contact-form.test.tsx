import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitContact } from "@/lib/api";
import { AcademyContactForm } from "./academy-contact-form";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  submitContact: vi.fn(),
}));

const mockedSubmitContact = vi.mocked(submitContact);

describe("AcademyContactForm", () => {
  beforeEach(() => mockedSubmitContact.mockReset());

  it("keeps consent unchecked and submits the academy payload once", async () => {
    mockedSubmitContact.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<AcademyContactForm slug="academia-demo" title="Fale conosco" />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Mensagem"), "Quero conhecer a academia.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Mensagem enviada");
    expect(mockedSubmitContact).toHaveBeenCalledTimes(1);
    expect(mockedSubmitContact.mock.calls[0][0]).toEqual(expect.objectContaining({
      academy_slug: "academia-demo",
      consent: true,
      contact_type: "other",
    }));
  });

  it("restores the action after an API error", async () => {
    mockedSubmitContact.mockResolvedValue({ fields: {}, general: ["Serviço indisponível."] });
    const user = userEvent.setup();
    render(<AcademyContactForm slug="academia-demo" title="Fale conosco" />);

    await user.type(screen.getByLabelText("Nome"), "Ana");
    await user.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await user.type(screen.getByLabelText("Mensagem"), "Olá");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço indisponível.");
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });
});
