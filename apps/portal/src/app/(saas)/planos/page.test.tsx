import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PlansPage from "./page";

afterEach(() => vi.unstubAllGlobals());
const stub = (value: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(value));

describe("PlansPage", () => {
  it("shows a single Pro plan with price and student limit", async () => {
    stub({ ok: true, json: async () => ({ results: [{ id: "1", code: "pro", name: "Pro", features: ["Treinos"] }] }) });
    render(await PlansPage());
    expect(screen.getByText(/R\$ 99/)).toBeInTheDocument();
    expect(screen.getByText("Até 500 alunos ativos")).toBeInTheDocument();
  });
  it("shows an error when the API fails and never invents availability", async () => {
    stub({ ok: false });
    render(await PlansPage());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 99/)).toBeNull();
  });
  it("shows an empty state when Pro is absent", async () => {
    stub({ ok: true, json: async () => ({ results: [] }) });
    render(await PlansPage());
    expect(screen.getByText(/não está publicado/)).toBeInTheDocument();
  });
});
