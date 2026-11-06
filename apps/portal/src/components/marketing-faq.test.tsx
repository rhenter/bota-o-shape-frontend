import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingFaq, marketingFaqItems } from "./marketing-faq";

describe("MarketingFaq", () => {
  it("uses only features published by the plan API", () => {
    const items = marketingFaqItems({ id: "1", code: "pro", name: "Pro", features: ["Treinos", "Avaliações"], limits: {}, price_reference: "99" });
    render(<MarketingFaq items={items} />);
    expect(screen.getByText("O que está incluso no plano Pro?")).toBeInTheDocument();
    expect(screen.getByText(/Treinos, Avaliações/)).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });
});
