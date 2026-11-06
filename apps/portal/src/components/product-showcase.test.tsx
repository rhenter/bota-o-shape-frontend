import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductShowcase } from "./product-showcase";

describe("ProductShowcase", () => {
  it("switches profiles and opens the real screenshot zoom", () => {
    render(<ProductShowcase />);
    fireEvent.click(screen.getByRole("button", { name: /^Professor/ }));
    expect(screen.getByRole("heading", { name: "Professor" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ampliar: Construtor/ }));
    expect(screen.getByRole("dialog", { name: /Construtor/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar imagem ampliada" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
