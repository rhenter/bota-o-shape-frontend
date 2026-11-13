import { describe, expect, it, vi } from "vitest";

import { PlatformApi, PlatformApiError } from "./platform-api";

function jwt(exp: number) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "none" })}.${encode({ exp })}.signature`;
}

function memoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

const tokens = {
  access: jwt(Math.floor(Date.now() / 1000) + 300),
  refresh: "refresh-token",
};

describe("PlatformApi authentication", () => {
  it("stores a successful platform login in isolated session storage", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(tokens), { status: 200 }),
    );
    const storage = memoryStorage();
    const api = new PlatformApi("https://platform.example.com", fetcher, storage);

    await api.login("operator@example.com", "secret");

    expect(api.authenticated).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "https://platform.example.com/api/v1/platform/auth/login/",
      expect.objectContaining({ method: "POST" }),
    );
    expect([...storage.values.values()][0]).toContain("refresh-token");
  });

  it("reports when the API requires MFA", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ detail: "MFA obrigatório.", mfa_required: true }),
        { status: 401 },
      ),
    );
    const api = new PlatformApi("", fetcher, memoryStorage());

    await expect(api.login("operator@example.com", "secret")).rejects.toMatchObject({
      status: 401,
      mfaRequired: true,
    });
  });

  it("rotates an expired access token before loading the operator", async () => {
    const storage = memoryStorage({
      "bota-o-shape:platform-session": JSON.stringify({
        access: jwt(Math.floor(Date.now() / 1000) - 60),
        refresh: "old-refresh",
      }),
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(tokens), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "membership-id",
            email: "operator@example.com",
            name: "Operator",
            role: "staff",
            capabilities: ["accounts.read"],
            is_active: true,
            mfa_enabled: true,
          }),
          { status: 200 },
        ),
      );
    const api = new PlatformApi("", fetcher, storage);

    expect(api.restore()).toBe(true);
    await expect(api.me()).resolves.toMatchObject({ email: "operator@example.com" });
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/platform/auth/refresh/");
    expect(fetcher.mock.calls[1][0]).toBe("/api/v1/platform/auth/me/");
  });

  it("clears the session when refresh is rejected", async () => {
    const storage = memoryStorage({
      "bota-o-shape:platform-session": JSON.stringify({
        access: jwt(Math.floor(Date.now() / 1000) - 60),
        refresh: "revoked-refresh",
      }),
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Refresh revogado." }), { status: 401 }),
    );
    const api = new PlatformApi("", fetcher, storage);

    api.restore();
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(api.authenticated).toBe(false);
    expect(storage.values.size).toBe(0);
  });
});

describe("Asaas platform calls", () => {
  it("sends the refund body and reuses the caller idempotency key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/login/")) {
        return new Response(JSON.stringify(tokens), { status: 200 });
      }
      return new Response(
        JSON.stringify({ id: "op-1", status: "succeeded", result_data: {}, error_message: "" }),
        { status: 200 },
      );
    });
    const api = new PlatformApi("https://platform.example.com", fetcher, memoryStorage());
    await api.login("operator@example.com", "secret");
    await api.refundInvoice("invoice-1", { amount_minor: 400, reason: "Estorno parcial aprovado." }, "same-key");
    await api.refundInvoice("invoice-1", { amount_minor: 400, reason: "Estorno parcial aprovado." }, "same-key");
    const refunds = fetcher.mock.calls.filter(([url]) => String(url).endsWith("/refund/"));
    expect(refunds).toHaveLength(2);
    for (const [, init] of refunds) {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("same-key");
      expect(init?.body).toBe(JSON.stringify({ amount_minor: 400, reason: "Estorno parcial aprovado." }));
    }
  });

  it("keeps a timeout uncertain instead of treating it as a refusal", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/login/")) {
        return new Response(JSON.stringify(tokens), { status: 200 });
      }
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    });
    const api = new PlatformApi("https://platform.example.com", fetcher, memoryStorage());
    await api.login("operator@example.com", "secret");
    await expect(api.syncPlatformInvoice("invoice-1", "sync-key")).rejects.toMatchObject({
      status: 0,
      uncertain: true,
    } satisfies Partial<PlatformApiError>);
  });

  it("asks the provider receivables endpoint for server pagination", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/login/")) {
        return new Response(JSON.stringify(tokens), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [], has_more: false, next_offset: null }), { status: 200 });
    });
    const api = new PlatformApi("https://platform.example.com", fetcher, memoryStorage());
    await api.login("operator@example.com", "secret");
    await api.providerReceivables("provider-1", { offset: 50, limit: 50, status: "received" });
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain(
      "/integrations/providers/provider-1/receivables/?offset=50&limit=50&status=received",
    );
  });
});
