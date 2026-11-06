import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { modalitiesOf, whatsappUrl } from "@/lib/api";
import { AcademyLanding, AcademyUnavailable } from "./academy-landing";

describe("AcademyLanding", () => {
  it("renders name, tagline and student CTA", () => {
    render(<AcademyLanding academy={{ name: "Gym Alfa", slug: "alfa", profile: { tagline: "Treine forte" } }} />);
    expect(screen.getByRole("heading", { name: "Treine forte" })).toBeInTheDocument();
    expect(screen.getAllByText("Gym Alfa")[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /aluno/i })[0]).toBeInTheDocument();
  });
  it("ignores non-https logos", () => {
    render(<AcademyLanding academy={{ name: "G", slug: "g", profile: { logo_url: "javascript:alert(1)" } }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("shows distinct inactive and failure states", () => {
    const { rerender } = render(<AcademyUnavailable failed={false} />);
    expect(screen.getByText(/não está ativa/)).toBeInTheDocument();
    rerender(<AcademyUnavailable failed />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders modalities and contact only when provided", () => {
    const profile = { modalities: [{ title: "Musculação", text: "Completa" }, { nope: 1 }], whatsapp: "+55 (11) 99999-9999", address: "Rua A, 1" };
    render(<AcademyLanding academy={{ name: "G", slug: "g", profile }} />);
    expect(screen.getByText("MUSCULAÇÃO")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511999999999");
    expect(screen.getByText("Rua A, 1")).toBeInTheDocument();
  });
  it("omits sections without content", () => {
    render(<AcademyLanding academy={{ name: "G", slug: "g", profile: {} }} />);
    expect(screen.queryByText("FALE CONOSCO")).toBeNull();
    expect(screen.queryByRole("link", { name: "Modalidades" })).toBeNull();
  });
});

describe("profile helpers", () => {
  it("drops malformed modalities and implausible phones", () => {
    expect(modalitiesOf({ modalities: "x" })).toEqual([]);
    expect(modalitiesOf({ modalities: [null, { title: " " }, { title: "A" }] })).toEqual([{ title: "A", text: "" }]);
    expect(whatsappUrl("123")).toBeNull();
    expect(whatsappUrl(undefined)).toBeNull();
  });
});
