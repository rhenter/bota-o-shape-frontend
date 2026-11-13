import { describe, expect, it, vi } from "vitest";
import { fetchAcademy, fetchFaq, fetchPlans, fetchPublicContact, lookupPostalCode, platformLinks, registerOwner, submitContact } from "./api";
import { landingLogoUrl } from "./landing-logo";

const owner = {
  tenant_name: "A",
  person_type: "individual" as const,
  tax_id: "52998224725",
  profile: "personal_trainer" as const,
  first_name: "B",
  last_name: "",
  email: "a@b.co",
  password: "x",
  address: {
    postal_code: "01310100",
    street: "Rua A",
    number: "1",
    district: "Centro",
    city: "São Paulo",
    state: "SP",
  },
};

describe("fetchPlans", () => {
  it("hides the pilot plan and reads paginated results", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ code: "pilot" }, { code: "pro" }] }) });
    const plans = await fetchPlans(f as never);
    expect(plans?.map((p) => p.code)).toEqual(["pro"]);
    expect(plans?.[0]?.features).toEqual([]);
  });
  it("reads price, limits and features from the published version", async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          id: "1",
          code: "start",
          name: "Start",
          current_version: { features: { has_workouts: true }, limits: { active_students: 300 }, price_reference: "R$ 199,00/mês" },
        }],
      }),
    });
    const plans = await fetchPlans(f as never);
    expect(plans?.[0]).toMatchObject({
      code: "start",
      features: ["workouts"],
      limits: { active_students: 300 },
      price_reference: "R$ 199,00/mês",
    });
  });
  it("returns null when the API is unavailable", async () => {
    expect(await fetchPlans(vi.fn().mockRejectedValue(new Error("down")) as never)).toBeNull();
    expect(await fetchPlans(vi.fn().mockResolvedValue({ ok: false }) as never)).toBeNull();
  });
});

describe("fetchFaq", () => {
  it("reads the published list for the requested locale", async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "1", question: "O app do aluno está incluso?", answer: "Sim." }],
    });
    expect(await fetchFaq("pt-BR", f as never)).toEqual([
      { id: "1", question: "O app do aluno está incluso?", answer: "Sim." },
    ]);
    expect(f.mock.calls[0][0]).toContain("/api/v1/support/faq/?locale=pt-BR");
  });

  it("returns null when the API is unavailable", async () => {
    expect(await fetchFaq("en", vi.fn().mockRejectedValue(new Error("down")) as never)).toBeNull();
    expect(await fetchFaq("en", vi.fn().mockResolvedValue({ ok: false }) as never)).toBeNull();
  });
});

describe("lookupPostalCode", () => {
  it("returns the address from the API", async () => {
    const address = { postal_code: "01310100", street: "Avenida Paulista", district: "Bela Vista", city: "São Paulo", state: "SP" };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => address });
    expect(await lookupPostalCode("01310100", fetcher as never)).toEqual({ address });
    expect(fetcher.mock.calls[0][0]).toBe("/api/tenancy/postal-code/01310100/");
  });

  it("distinguishes a missing code from an outage", async () => {
    expect(await lookupPostalCode("00000000", vi.fn().mockResolvedValue({ ok: false, status: 404 }) as never)).toEqual({ error: "missing" });
    expect(await lookupPostalCode("01310100", vi.fn().mockRejectedValue(new Error("down")) as never)).toEqual({ error: "unavailable" });
  });
});

describe("landingLogoUrl", () => {
  it("keeps an uploaded media path and drops anything else unsafe", () => {
    expect(landingLogoUrl("/media/landing-logos/logo.png")).toBe("/media/landing-logos/logo.png");
    expect(landingLogoUrl("http://127.0.0.1:8006/media/landing-logos/logo.png")).toBe("/media/landing-logos/logo.png");
    expect(landingLogoUrl("https://cdn.example/logo.png")).toBe("https://cdn.example/logo.png");
    expect(landingLogoUrl("javascript:alert(1)")).toBeNull();
    expect(landingLogoUrl("http://evil.example/logo.png")).toBeNull();
    expect(landingLogoUrl("/media/../secret")).toBeNull();
  });
});

describe("registerOwner", () => {
  it("returns null on success", async () => {
    expect(await registerOwner(owner, vi.fn().mockResolvedValue({ ok: true }) as never)).toBeNull();
  });
  it("surfaces API validation messages", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ email: ["Já existe uma conta com este e-mail."] }) });
    expect(await registerOwner(owner, f as never)).toEqual({ fields: { email: ["Já existe uma conta com este e-mail."] }, general: [] });
  });
  it("falls back to a generic message", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    expect((await registerOwner(owner, f as never))?.general[0]).toMatch(/Não foi possível/);
  });
});

describe("public contact", () => {
  it("reads public settings and submits contact data", async () => {
    const settings = { whatsapp: "5511999999999", email: "contato@example.com", social_urls: {} };
    expect(await fetchPublicContact(vi.fn().mockResolvedValue({ ok: true, json: async () => settings }) as never)).toEqual(settings);
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    expect(await submitContact({ name: "Ana", email: "ana@example.com", phone: "", contact_type: "other", message: "Olá", consent: true }, fetcher as never)).toBeNull();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ consent: true, message: "Olá" });
  });

  it("keeps only https platform document URLs", () => {
    expect(platformLinks({
      whatsapp: "",
      email: "contato@example.com",
      social_urls: {},
      privacy_url: "https://www.botaoshape.com.br/privacidade",
      terms_url: "javascript:alert(1)",
      portal_url: "",
    })).toEqual({
      privacyUrl: "https://www.botaoshape.com.br/privacidade",
      termsUrl: null,
      portalUrl: null,
    });
    expect(platformLinks(null)).toEqual({ privacyUrl: null, termsUrl: null, portalUrl: null });
  });
  it("does not invent settings and surfaces contact errors", async () => {
    expect(await fetchPublicContact(vi.fn().mockRejectedValue(new Error("down")) as never)).toBeNull();
    const error = await submitContact(
      { name: "", email: "bad", phone: "", contact_type: "other", message: "", consent: false },
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ consent: ["Obrigatório."] }) }) as never,
    );
    expect(error?.fields.consent).toEqual(["Obrigatório."]);
  });
});

describe("fetchAcademy", () => {
  it("returns the academy", async () => {
    const academy = { name: "Gym", slug: "gym", profile: {} };
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => academy });
    expect(await fetchAcademy({ slug: "gym" }, f as never)).toEqual({ status: "ok", academy });
    expect(f.mock.calls[0][0]).toContain("/public/academies/gym/");
  });
  it("resolves by host", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await fetchAcademy({ host: "gym.com" }, f as never)).toEqual({ status: "not_found" });
    expect(f.mock.calls[0][0]).toContain("/public/resolve/?host=gym.com");
  });
  it("reports failures distinctly from 404", async () => {
    expect(await fetchAcademy({ slug: "x" }, vi.fn().mockRejectedValue(new Error("down")) as never)).toEqual({ status: "error" });
    expect(await fetchAcademy({ slug: "x" }, vi.fn().mockResolvedValue({ ok: false, status: 500 }) as never)).toEqual({ status: "error" });
  });
});
