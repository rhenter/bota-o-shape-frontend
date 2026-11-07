import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ptBR } from "@/i18n/pt-BR";
import type { Plan } from "@/lib/api";
import { HomePlanTeaser, lowestPublishedPrice } from "./page";

const plan = (code: string, price: string): Plan => ({
  id: code,
  code,
  name: code,
  features: [],
  limits: {},
  price_reference: price,
});

describe("lowestPublishedPrice", () => {
  it("uses the lowest numeric price published by the API", () => {
    const price = lowestPublishedPrice([
      plan("pro", "R$ 299,00/mês"),
      plan("start", "R$ 149,90/mês"),
      plan("enterprise", "Consulte"),
    ]);
    expect(price).toBe("R$ 149,90/mês");
  });

  it("returns null when no published price is numeric", () => {
    expect(lowestPublishedPrice(null)).toBeNull();
    expect(lowestPublishedPrice([plan("enterprise", "Consulte")])).toBeNull();
  });
});

describe("HomePlanTeaser", () => {
  it("points to the plans page with broad benefits and the published starting price", () => {
    render(<HomePlanTeaser price="R$ 149,90/mês" copy={ptBR.home} />);
    expect(screen.getByText("Conheça nossos planos")).toBeInTheDocument();
    expect(screen.getByText("A partir de")).toBeInTheDocument();
    expect(screen.getByText("R$ 149,90/mês")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("Plano Pro")).toBeNull();
    expect(screen.getByRole("link", { name: "Ver todos os planos" })).toHaveAttribute("href", "/planos");
  });

  it("omits the price when the API did not publish one", () => {
    render(<HomePlanTeaser price={null} copy={ptBR.home} />);
    expect(screen.queryByText("A partir de")).toBeNull();
    expect(screen.queryByText(/R\$/)).toBeNull();
    expect(screen.getByRole("link", { name: "Ver todos os planos" })).toBeInTheDocument();
  });
});
