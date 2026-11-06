import { describe, expect, it } from "vitest";
import type { Membership, Student, User } from "./domain";
import { canManageBilling, canPublishMealPlan } from "./permissions";

const user: User = {
  id: "professional-1", name: "Profissional de demonstração", email: "demo@example.test",
  nutritionRegistration: { crn: "00000", uf: "SP", status: "verified" },
};
const membership: Membership = {
  id: "membership-1", tenantId: "tenant-1", userId: user.id, status: "active",
  roles: ["professor", "nutritionist"], permissions: [],
};
const student: Student = {
  id: "student-1", tenantId: "tenant-1", name: "Aluno de demonstração", email: "aluno@example.test",
  status: "active", coachIds: [user.id], dietitianIds: [user.id], nutritionConsent: true,
};

describe("canPublishMealPlan", () => {
  it("supports combined professional roles when the nutrition registration is verified", () => {
    expect(canPublishMealPlan(user, membership, student)).toBe(true);
  });

  it.each(["professor", "admin", "student"] as const)("denies %s without the nutritionist role", (role) => {
    expect(canPublishMealPlan(user, { ...membership, roles: [role] }, student)).toBe(false);
  });

  it("requires verified CRN and UF", () => {
    expect(canPublishMealPlan({ ...user, nutritionRegistration: undefined }, membership, student)).toBe(false);
    expect(canPublishMealPlan({ ...user, nutritionRegistration: { crn: "00000", uf: "SP", status: "pending" } }, membership, student)).toBe(false);
    expect(canPublishMealPlan({ ...user, nutritionRegistration: { crn: "", uf: "SP", status: "verified" } }, membership, student)).toBe(false);
    expect(canPublishMealPlan({ ...user, nutritionRegistration: { crn: "00000", uf: "", status: "verified" } }, membership, student)).toBe(false);
  });

  it("requires an active membership belonging to this user and tenant", () => {
    expect(canPublishMealPlan(user, undefined, student)).toBe(false);
    expect(canPublishMealPlan(user, { ...membership, status: "inactive" }, student)).toBe(false);
    expect(canPublishMealPlan(user, { ...membership, tenantId: "tenant-2" }, student)).toBe(false);
    expect(canPublishMealPlan(user, { ...membership, userId: "someone-else" }, student)).toBe(false);
  });

  it("requires an active assigned student and explicit nutrition consent, including for admins", () => {
    expect(canPublishMealPlan(user, membership, { ...student, nutritionConsent: false })).toBe(false);
    expect(canPublishMealPlan(user, membership, { ...student, status: "archived" })).toBe(false);
    expect(canPublishMealPlan(user, { ...membership, roles: ["admin", "nutritionist"] }, { ...student, dietitianIds: [] })).toBe(false);
  });
});

describe("canManageBilling", () => {
  it("requires the separate billing permission on an active membership in the requested tenant", () => {
    const finance = { ...membership, permissions: ["billing.manage"] as const };
    expect(canManageBilling(user, finance, "tenant-1")).toBe(true);
    expect(canManageBilling(user, { ...membership, roles: ["admin"] }, "tenant-1")).toBe(false);
    expect(canManageBilling(user, finance, "tenant-2")).toBe(false);
    expect(canManageBilling(user, { ...finance, status: "inactive" }, "tenant-1")).toBe(false);
    expect(canManageBilling(user, { ...finance, userId: "someone-else" }, "tenant-1")).toBe(false);
    expect(canManageBilling(user, undefined, "tenant-1")).toBe(false);
  });
});
