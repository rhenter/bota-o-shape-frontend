import { describe, expect, it } from "vitest";
import { demoIds, demoRepository } from "./demo-repository";

const context = { userId: demoIds.user, tenantId: demoIds.tenant };

describe("demoRepository isolation", () => {
  it("returns data only from the selected tenant", () => {
    expect(demoRepository.getStudents(context)).toHaveLength(3);
    const other = demoRepository.getStudents({ ...context, tenantId: demoIds.secondTenant });
    expect(other).toHaveLength(1);
    expect(other.every((item) => item.tenantId === demoIds.secondTenant)).toBe(true);
    expect(demoRepository.getSubscription({ ...context, tenantId: demoIds.secondTenant })).toBeUndefined();
    expect(demoRepository.getMealPlans({ ...context, tenantId: demoIds.secondTenant })).toEqual([]);
  });

  it("denies unknown users and tenants by default", () => {
    expect(demoRepository.getStudents({ ...context, userId: "unknown" })).toEqual([]);
    expect(demoRepository.getExercises({ ...context, tenantId: "unknown" })).toEqual([]);
    expect(demoRepository.getTenants("unknown")).toEqual([]);
    expect(demoRepository.getTeam({ ...context, userId: "unknown" })).toEqual([]);
  });

  it("returns copies so local editing cannot change fixture history", () => {
    const food = demoRepository.getFoods(context)[0];
    food.nutrientsPer100g.energyKcal = 999;
    expect(demoRepository.getFoods(context)[0].nutrientsPer100g.energyKcal).toBe(120);
    expect(demoRepository.mode).toBe("demo");
  });
});
