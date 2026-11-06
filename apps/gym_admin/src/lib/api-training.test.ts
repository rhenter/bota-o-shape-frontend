import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "./api-client";
const json = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });
describe("contratos de treino e avaliação", () => {
  it("usa revisão retornada pela API, versão publicada e payload exato de atribuição", async () => {
    const revision = {
      id: "new-id",
      version: 7,
      status: "draft",
      supersedes: "original-id",
      days: [],
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access: "a", refresh: "r" }))
      .mockResolvedValueOnce(json(revision))
      .mockResolvedValueOnce(json({ ...revision, status: "published" }))
      .mockResolvedValueOnce(json({ id: "assignment-1" }))
      .mockResolvedValueOnce(json([]));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@test.test", "password");
    expect(await client.reviseWorkout("tenant-1", "original-id")).toEqual(
      revision,
    );
    await client.publishWorkout("tenant-1", revision.id);
    await client.createWorkoutAssignment("tenant-1", {
      template: revision.id,
      student: "student-1",
      starts_on: "2026-10-17",
      ends_on: null,
      is_active: true,
    });
    await client.getWorkoutSessions("tenant-1");
    expect(fetcher.mock.calls.slice(1).map(([url]) => url)).toEqual([
      "http://api.test/api/workouts/templates/original-id/revise/",
      "http://api.test/api/workouts/templates/new-id/publish/",
      "http://api.test/api/workouts/assignments/",
      "http://api.test/api/workouts/sessions/",
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[3][1]?.body))).toEqual({
      template: "new-id",
      student: "student-1",
      starts_on: "2026-10-17",
      ends_on: null,
      is_active: true,
    });
    for (const [, init] of fetcher.mock.calls.slice(1))
      expect(new Headers(init?.headers).get("X-Tenant-ID")).toBe("tenant-1");
  });
  it("consulta protocolos e relatório, e transmite o status real da transição", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access: "a", refresh: "r" }))
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({ id: "a1", status: "reviewed" }))
      .mockResolvedValueOnce(json({ comparisons: [] }));
    const client = new ApiClient("http://api.test", fetcher);
    await client.login("a@test.test", "password");
    await client.getAssessmentProtocols("tenant-2");
    await client.transitionAssessment("tenant-2", "a1", "reviewed");
    await client.getAssessmentReport("tenant-2", "a1");
    expect(fetcher.mock.calls.slice(1).map(([url]) => url)).toEqual([
      "http://api.test/api/assessments/protocols/",
      "http://api.test/api/assessments/assessments/a1/transition/",
      "http://api.test/api/assessments/assessments/a1/report/",
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({
      status: "reviewed",
    });
    expect(
      new Headers(fetcher.mock.calls[3][1]?.headers).get("X-Tenant-ID"),
    ).toBe("tenant-2");
  });
});
