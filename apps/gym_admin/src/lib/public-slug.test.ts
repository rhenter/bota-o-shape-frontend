import { describe, expect, it } from "vitest";
import { normalizePublicSlug, publicSlugIssue } from "./public-slug";

describe("public slug", () => {
  it("accepts a simple academy address and normalizes it", () => {
    expect(normalizePublicSlug("  Academia-Centro ")).toBe("academia-centro");
    expect(publicSlugIssue("academia-centro")).toBeNull();
    expect(publicSlugIssue("")).toBeNull();
  });

  it("rejects internal paths and malformed addresses before save", () => {
    expect(publicSlugIssue("contato")).toBe("reserved");
    expect(publicSlugIssue("admin")).toBe("reserved");
    expect(publicSlugIssue("planos")).toBe("reserved");
    expect(publicSlugIssue("Minha Academia")).toBe("invalid");
    expect(publicSlugIssue("academia_centro")).toBe("invalid");
    expect(publicSlugIssue("-academia")).toBe("invalid");
  });
});
