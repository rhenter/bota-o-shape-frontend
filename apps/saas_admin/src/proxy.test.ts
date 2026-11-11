import { describe, expect, it } from "vitest";

import { headersForApiProxy } from "./proxy";

describe("platform API proxy", () => {
  it("drops browser origin headers before the API sees the request", () => {
    const forwarded = headersForApiProxy(
      new Headers({
        origin: "http://localhost:3002",
        referer: "http://localhost:3002/entrar",
        "content-type": "application/json",
      }),
    );

    expect(forwarded.get("origin")).toBeNull();
    expect(forwarded.get("referer")).toBeNull();
    expect(forwarded.get("content-type")).toBe("application/json");
  });
});
