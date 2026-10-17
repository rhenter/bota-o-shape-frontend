import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./api-client";

const access = `header.${btoa(JSON.stringify({ user_id: "user-1" }))}.signature`;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("contrato HTTP da API Django", () => {
  it("envia credenciais ao endpoint real e o tenant somente no cabeçalho de domínio", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockResolvedValueOnce(json({ count: 0, next: null, results: [] }));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    expect(client.userId).toBe("user-1");
    await client.getEquipment("tenant-1");
    expect(fetcher.mock.calls[0][0]).toBe(
      "http://api.test/api/user/auth/token/",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      email: "a@example.test",
      password: "senha",
    });
    const headers = new Headers(fetcher.mock.calls[1][1]?.headers);
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("Authorization")).toBe(`Bearer ${access}`);
  });

  it("rotaciona refresh, repete uma vez e usa o novo refresh ao revogar", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ access: "new-access", refresh: "r2" }))
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    await client.getTenants();
    expect(fetcher.mock.calls[2][0]).toBe(
      "http://api.test/api/user/auth/token/refresh/",
    );
    expect(
      new Headers(fetcher.mock.calls[3][1]?.headers).get("Authorization"),
    ).toBe("Bearer new-access");
    await client.logout();
    expect(JSON.parse(String(fetcher.mock.calls[4][1]?.body))).toEqual({
      refresh: "r2",
    });
    expect(client.authenticated).toBe(false);
  });

  it("encerra a sessão se a renovação falhar, sem repetir indefinidamente", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({}, 401));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    await expect(client.getTenants()).rejects.toBeInstanceOf(ApiError);
    expect(client.authenticated).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("não envia o bearer token para uma origem de paginação externa", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockResolvedValueOnce(
        json({
          count: 1,
          next: "https://other.test/api/tenancy/tenants/",
          results: [],
        }),
      );
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    await expect(client.getTenants()).rejects.toThrow(/origem inválida/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("convida por membership e arquiva sem DELETE ou senha no payload", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockImplementation(async () => json({ id: "membership-1" }));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    await client.invite("tenant-1", "aluno@example.test", ["student"]);
    await client.archiveMembership("tenant-1", "membership-1");
    expect(fetcher.mock.calls[1][0]).toBe(
      "http://api.test/api/tenancy/memberships/invite/",
    );
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      email: "aluno@example.test",
      roles: ["student"],
    });
    expect(fetcher.mock.calls[2][0]).toBe(
      "http://api.test/api/tenancy/memberships/membership-1/archive/",
    );
    expect(fetcher.mock.calls[2][1]?.method).toBe("POST");
  });

  it("mantém a sessão encerrada quando o logout acontece durante a renovação", async () => {
    let resolveRotation!: (response: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access, refresh: "r1" }))
      .mockResolvedValueOnce(json({}, 401))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRotation = resolve;
          }),
      );
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@example.test", "senha");
    const request = client.getTenants();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    client.clearSession();
    resolveRotation(json({ access: "new", refresh: "r2" }));
    await expect(request).rejects.toThrow(/Entre para acessar/);
    expect(client.authenticated).toBe(false);
  });
});
