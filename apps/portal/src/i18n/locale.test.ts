import { describe, expect, it } from "vitest";
import { fill, negotiateLocale } from "./locale";

describe("negotiateLocale", () => {
  it("defaults to Brazilian Portuguese", () => {
    expect(negotiateLocale(null)).toBe("pt-BR");
    expect(negotiateLocale("")).toBe("pt-BR");
    expect(negotiateLocale("fr-FR, de;q=0.8")).toBe("pt-BR");
  });

  it("follows quality order", () => {
    expect(negotiateLocale("en-US,en;q=0.9,pt-BR;q=0.8")).toBe("en");
    expect(negotiateLocale("pt-BR,en;q=0.9")).toBe("pt-BR");
    expect(negotiateLocale("en;q=0.4, pt;q=0.9")).toBe("pt-BR");
  });

  it("fills named placeholders", () => {
    expect(fill("Up to {students} active members", { students: 500 })).toBe("Up to 500 active members");
  });

  it("matches language prefixes", () => {
    expect(negotiateLocale("pt")).toBe("pt-BR");
    expect(negotiateLocale("en-GB")).toBe("en");
  });
});
