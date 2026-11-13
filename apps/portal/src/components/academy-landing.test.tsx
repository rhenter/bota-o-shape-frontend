import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { whatsappUrl } from "@/lib/api";
import { ptBR } from "@/i18n/pt-BR";
import { offeredServices } from "@/lib/services";
import { AcademyLanding, AcademyUnavailable } from "./academy-landing";

describe("AcademyLanding", () => {
  it("renders name, tagline and student CTA", () => {
    render(<AcademyLanding academy={{ name: "Gym Alfa", slug: "alfa", profile: { tagline: "Treine forte" } }} />);
    expect(screen.getByRole("heading", { name: "Treine forte" })).toBeInTheDocument();
    expect(screen.getAllByText("Gym Alfa")[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /aluno/i })[0]).toBeInTheDocument();
  });
  it("shows the uploaded landing logo", () => {
    const { container } = render(
      <AcademyLanding
        academy={{
          name: "Academia Demo",
          slug: "academia-demo",
          profile: {},
          landing: {
            mode: "standard",
            title: "Academia Demo",
            logo: "/media/landing-logos/logo.png",
            phone: "",
            email: "",
            whatsapp: "",
            instagram_url: "",
            facebook_url: "",
            youtube_url: "",
            theme: "lime",
            background: "none",
          },
        }}
      />,
    );
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image).toHaveAttribute("src", "/media/landing-logos/logo.png");
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
    const profile = { services: ["strength_training", "unknown"], whatsapp: "+55 (11) 99999-9999", address: "Rua A, 1" };
    render(<AcademyLanding academy={{ name: "G", slug: "g", profile }} />);
    expect(screen.getByText("Musculação")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/5511999999999");
    expect(screen.getAllByText("Rua A, 1")).toHaveLength(1);
  });
  it("renders the saved landing page contacts", () => {
    render(
      <AcademyLanding
        academy={{
          name: "Academia Demo",
          slug: "academia-demo",
          profile: { address: "Avenida Paulista, 1000" },
          landing: {
            mode: "standard",
            title: "Treine na Paulista",
            logo: null,
            phone: "(11) 3000-0000",
            email: "contato@academiademo.example",
            whatsapp: "11999990000",
            instagram_url: "https://instagram.com/academiademo",
            facebook_url: "javascript:alert(1)",
            youtube_url: "",
            theme: "lime",
            background: "gym_floor",
          },
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Treine na Paulista" })).toBeInTheDocument();
    expect(screen.getAllByText("(11) 3000-0000")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/academiademo");
    expect(screen.queryByRole("link", { name: "Facebook" })).toBeNull();
    expect(screen.getAllByText("Avenida Paulista, 1000")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Faça sua matrícula" })).toHaveAttribute("href", "https://wa.me/11999990000");
  });
  it("keeps the academy name above the slogan and leaves legal names off the hero", () => {
    const { container } = render(
      <AcademyLanding
        academy={{
          name: "Academia Demo",
          legal_name: "Academia Demo Ltda",
          slug: "academia-demo",
          profile: { tagline: "Estrutura completa para os seus objetivos." },
          landing: {
            mode: "standard",
            title: "Academia Demo",
            logo: "https://cdn.example/logo.png",
            phone: "",
            email: "",
            whatsapp: "11999990000",
            instagram_url: "",
            facebook_url: "",
            youtube_url: "",
            theme: "ocean",
            background: "gym_floor",
          },
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Estrutura completa para os seus objetivos." })).toBeInTheDocument();
    expect(screen.getAllByText("Academia Demo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Razão social")).toBeNull();
    expect(screen.queryByText("Academia Demo Ltda")).toBeNull();
    expect(screen.queryByRole("img", { name: /logo/i })).toBeNull();
    expect(container.querySelector(".bg-gym_floor.theme-ocean")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Faça sua matrícula" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Fale no WhatsApp" })).toHaveLength(1);
  });
  it("offers black and white plates for logos that are not transparent", () => {
    const landing = {
      mode: "standard" as const,
      title: "Academia Demo",
      logo: "/media/landing-logos/logo.png",
      phone: "",
      email: "",
      whatsapp: "",
      instagram_url: "",
      facebook_url: "",
      youtube_url: "",
      background: "none" as const,
    };
    const { container, rerender } = render(
      <AcademyLanding academy={{ name: "Academia Demo", slug: "demo", profile: {}, landing: { ...landing, theme: "black" } }} />,
    );
    expect(container.querySelector(".theme-black")).not.toBeNull();
    rerender(<AcademyLanding academy={{ name: "Academia Demo", slug: "demo", profile: {}, landing: { ...landing, theme: "white" } }} />);
    expect(container.querySelector(".theme-white")).not.toBeNull();
  });
  it("puts only platform documents and the platform signature beside the academy brand", () => {
    render(
      <AcademyLanding
        academy={{
          name: "Academia Demo",
          slug: "demo",
          profile: { address: "Rua A, 1" },
          landing: {
            mode: "standard",
            title: "Academia Demo",
            logo: "https://cdn.example/logo.png",
            phone: "(11) 3000-0000",
            email: "",
            whatsapp: "11999990000",
            instagram_url: "https://instagram.com/academiademo",
            facebook_url: "",
            youtube_url: "",
            theme: "lime",
            background: "none",
          },
        }}
        platform={{
          privacyUrl: "https://www.botaoshape.com.br/privacidade",
          termsUrl: "https://www.botaoshape.com.br/termos",
          portalUrl: "https://www.botaoshape.com.br",
        }}
      />,
    );
    const footer = screen.getByRole("contentinfo");
    const docs = within(footer).getByRole("navigation", { name: "Documentos da plataforma Bota o Shape" });
    expect(within(docs).getByRole("link", { name: "Privacidade da plataforma" })).toHaveAttribute("href", "https://www.botaoshape.com.br/privacidade");
    expect(within(docs).getByRole("link", { name: "Privacidade da plataforma" })).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(docs).getByRole("link", { name: "Privacidade da plataforma" })).toHaveAttribute("target", "_blank");
    expect(within(docs).getByRole("link", { name: "Termos da plataforma" })).toHaveAttribute("href", "https://www.botaoshape.com.br/termos");
    expect(within(docs).getByRole("link", { name: "Termos da plataforma" })).toHaveAttribute("target", "_blank");
    expect(within(footer).getByRole("link", { name: "Tecnologia Bota o Shape!" })).toHaveAttribute("href", "https://www.botaoshape.com.br");
    expect(within(footer).getByRole("link", { name: "Tecnologia Bota o Shape!" })).toHaveAttribute("target", "_blank");
    expect(within(footer).queryByText("Rua A, 1")).toBeNull();
    expect(within(footer).queryByText("(11) 3000-0000")).toBeNull();
    expect(within(footer).queryByRole("link", { name: "Instagram" })).toBeNull();
    expect(screen.getAllByText("Rua A, 1")).toHaveLength(1);
    expect(screen.getAllByText("(11) 3000-0000")).toHaveLength(1);
    const consent = screen.getByRole("checkbox");
    expect(consent).not.toBeChecked();
    expect(consent).toBeRequired();
    const privacy = screen.getAllByRole("link", { name: "Privacidade da plataforma" });
    expect(privacy).toHaveLength(2);
    expect(privacy[1]).toHaveAttribute("href", "https://www.botaoshape.com.br/privacidade");
  });
  it("omits platform links when the configuration has no https URL", () => {
    render(
      <AcademyLanding
        academy={{ name: "G", slug: "g", profile: {} }}
        platform={{ privacyUrl: "javascript:alert(1)", termsUrl: null, portalUrl: "http://insecure.example" }}
      />,
    );
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByRole("link", { name: "Privacidade da plataforma" })).toBeNull();
    expect(within(footer).queryByRole("link", { name: "Termos da plataforma" })).toBeNull();
    expect(within(footer).getByText("Tecnologia Bota o Shape!")).toBeInTheDocument();
    expect(within(footer).queryByRole("link", { name: "Tecnologia Bota o Shape!" })).toBeNull();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByRole("link", { name: "Privacidade da plataforma" })).toBeNull();
  });
  it("omits sections without content", () => {
    render(<AcademyLanding academy={{ name: "G", slug: "g", profile: {} }} />);
    expect(screen.getByRole("heading", { name: "Fale conosco" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Modalidades" })).toBeNull();
  });
});

describe("profile helpers", () => {
  it("preserves service order and identifiers and rejects implausible phones", () => {
    const labels = ptBR.academy.offeredServices;
    expect(offeredServices("x", labels)).toEqual([]);
    expect(offeredServices(["nope", "cardio", "cardio"], labels)).toEqual([
      { code: "nope", title: "nope" },
      { code: "cardio", title: "Cardio" },
      { code: "cardio", title: "Cardio" },
    ]);
    expect(whatsappUrl("123")).toBeNull();
    expect(whatsappUrl(undefined)).toBeNull();
  });
});
