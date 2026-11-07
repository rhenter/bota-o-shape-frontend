import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingFaq } from "./marketing-faq";

describe("MarketingFaq", () => {
  it("renders the questions published by the API", () => {
    render(
      <MarketingFaq
        items={[
          { question: "O app do aluno está incluso?", answer: "Sim. O aluno usa o aplicativo." },
        ]}
      />,
    );
    expect(screen.getByText("O app do aluno está incluso?")).toBeInTheDocument();
    expect(screen.getByText("Sim. O aluno usa o aplicativo.")).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });
});
