import { describe, expect, it } from "vitest";
import { customDomainRewrite, portalHosts } from "./proxy";

const hosts = portalHosts("botaoshape.com.br,www.botaoshape.com.br");

describe("customDomainRewrite", () => {
  it("keeps the main domain on the SaaS portal", () => {
    expect(customDomainRewrite("botaoshape.com.br", "/", hosts)).toBeNull();
    expect(customDomainRewrite("localhost:3001", "/", hosts)).toBeNull();
  });
  it("serves the landing for a custom domain root", () => {
    expect(customDomainRewrite("Gym.com:443", "/", hosts)).toBe("/host-landing/gym.com");
  });
  it("leaves internal routes and assets alone (no loops)", () => {
    expect(customDomainRewrite("gym.com", "/host-landing/gym.com", hosts)).toBeNull();
    expect(customDomainRewrite("gym.com", "/_next/static/a.js", hosts)).toBeNull();
    expect(customDomainRewrite("gym.com", "/api/x", hosts)).toBeNull();
  });
});
