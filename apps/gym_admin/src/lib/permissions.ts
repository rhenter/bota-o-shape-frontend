import type { Membership, Student, User } from "./domain";

export function canPublishMealPlan(user: User, membership: Membership | undefined, student: Student): boolean {
  const registration = user.nutritionRegistration;

  return Boolean(
    membership?.status === "active" &&
    membership.userId === user.id &&
    membership.tenantId === student.tenantId &&
    membership.roles.includes("nutritionist") &&
    registration?.status === "verified" &&
    registration.crn.trim() &&
    registration.uf.trim() &&
    student.status === "active" &&
    student.dietitianIds.includes(user.id) &&
    student.nutritionConsent,
  );
}

export function canManageBilling(user: User, membership: Membership | undefined, tenantId: string): boolean {
  return Boolean(
    membership?.status === "active" &&
    membership.userId === user.id &&
    membership.tenantId === tenantId &&
    membership.permissions.includes("billing.manage"),
  );
}
