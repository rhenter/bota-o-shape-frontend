import type { ApiClient } from "./api-client";
// Re-read server records before sensitive writes. This check supplements API authorization.
export async function assertNutritionAuthorization(
  api: ApiClient,
  tenantId: string,
  userId: string,
  studentId: string,
) {
  const [members, credentials, assignments, consents] = await Promise.all([
    api.getMemberships(tenantId),
    api.getCredentials(tenantId),
    api.getDietitianAssignments(tenantId),
    api.getConsents(tenantId),
  ]);
  const author = members.find(
    (m) => m.user === userId && m.status === "active",
  );
  const student = members.find(
    (m) =>
      m.user === studentId &&
      m.status === "active" &&
      m.roles.includes("student"),
  );
  const verified = credentials.some(
    (c) =>
      c.professional === userId &&
      c.kind === "crn" &&
      c.verified_at &&
      c.registration_number.trim() &&
      c.state.trim(),
  );
  const assigned = assignments.some(
    (a) => a.dietitian === userId && a.student === studentId && a.is_active,
  );
  const consent = consents.some(
    (c) =>
      c.subject === studentId &&
      c.purpose === "nutrition_plan" &&
      c.granted &&
      !c.revoked_at,
  );
  if (
    !author?.roles.includes("dietitian") ||
    !student ||
    !verified ||
    !assigned ||
    !consent
  )
    throw new Error(
      "Ação bloqueada: confirme papel de nutricionista, CRN/UF verificado, vínculo ativo e consentimento nutricional atual.",
    );
}
