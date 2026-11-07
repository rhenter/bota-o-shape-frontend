import { describe, expect, it } from "vitest";
import { adminRewrites } from "./admin-rewrites";

describe("adminRewrites", () => {
  it("stays empty until the gym service origin is configured", () => {
    expect(adminRewrites(undefined)).toEqual([]);
    expect(adminRewrites("  ")).toEqual([]);
  });

  it("sends /admin to the gym service, keeping the base path", () => {
    expect(adminRewrites("http://gym_admin.railway.internal:8080/")).toEqual([
      { source: "/admin", destination: "http://gym_admin.railway.internal:8080/admin" },
      { source: "/admin/:path*", destination: "http://gym_admin.railway.internal:8080/admin/:path*" },
    ]);
  });
});
