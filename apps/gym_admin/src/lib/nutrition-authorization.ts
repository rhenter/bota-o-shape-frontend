import type {
  ApiClient,
  ApiMembership,
  ApiCredential,
  ApiDietitianAssignment,
  ApiConsent,
} from "./api-client";
export function authorizedNutritionStudentIds(
  userId: string,
  members: ApiMembership[],
  credentials: ApiCredential[],
  assignments: ApiDietitianAssignment[],
  consents: ApiConsent[],
): Set<string> {
  const author = members.find(
    (member) => member.user === userId && member.status === "active",
  );
  const verified = credentials.some(
    (credential) =>
      credential.professional === userId &&
      credential.kind === "crn" &&
      credential.verified_at &&
      credential.registration_number.trim() &&
      credential.state.trim(),
  );
  if (!author?.roles.includes("dietitian") || !verified) return new Set();
  return new Set(
    members
      .filter(
        (member) =>
          member.status === "active" &&
          member.roles.includes("student") &&
          assignments.some(
            (assignment) =>
              assignment.student === member.user &&
              assignment.dietitian === userId &&
              assignment.is_active,
          ) &&
          consents.some(
            (consent) =>
              consent.subject === member.user &&
              consent.purpose === "nutrition_plan" &&
              consent.granted &&
              !consent.revoked_at,
          ),
      )
      .map((member) => member.user),
  );
}

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
  if (
    !authorizedNutritionStudentIds(
      userId,
      members,
      credentials,
      assignments,
      consents,
    ).has(studentId)
  )
    throw new Error(
      "Ação bloqueada: confirme papel de nutricionista, CRN/UF verificado, vínculo ativo e consentimento nutricional atual.",
    );
}
