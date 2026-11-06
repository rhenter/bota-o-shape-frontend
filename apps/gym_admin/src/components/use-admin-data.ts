"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "./app-context";
import type {
  ApiCredential,
  ApiDietitianAssignment,
  ApiMembership,
  ApiMealPlan,
  ApiFood,
  ApiConsent,
} from "@/lib/api-client";
import { demoFoodRecord, demoMealPlanRecord } from "@/lib/nutrition";
import { authorizedNutritionStudentIds } from "@/lib/nutrition-authorization";
import { canPublishMealPlan } from "@/lib/permissions";
interface Data {
  credentials: ApiCredential[];
  assignments: ApiDietitianAssignment[];
  members: ApiMembership[];
  plans: ApiMealPlan[];
  foods: ApiFood[];
  consents: ApiConsent[];
}
const empty: Data = {
  credentials: [],
  assignments: [],
  members: [],
  plans: [],
  foods: [],
  consents: [],
};
export function useAdminData(nutrition = false) {
  const app = useAppContext();
  const { api, mode, context, membership } = app;
  const isAdmin = Boolean(
    membership?.status === "active" &&
    membership.userId === context.userId &&
    membership.tenantId === context.tenantId &&
    membership.roles.includes("admin"),
  );
  const [snapshot, setSnapshot] = useState<{ scope: string; data: Data }>();
  const [failure, setFailure] = useState<{ scope: string; message: string }>();
  const [revision, setRevision] = useState(0);
  const clinicalRole = Boolean(membership?.roles.includes("nutritionist"));
  const scope = `${context.tenantId}:${context.userId}:${isAdmin}:${clinicalRole}:${nutrition}:${revision}`;
  useEffect(() => {
    if (mode !== "api" || !context.tenantId || !isAdmin) return;
    let active = true;
    Promise.all([
      api.getCredentials(context.tenantId),
      api.getDietitianAssignments(context.tenantId),
      api.getMemberships(context.tenantId),
      nutrition ? api.getFoods(context.tenantId) : Promise.resolve([]),
      nutrition ? api.getConsents(context.tenantId) : Promise.resolve([]),
    ])
      .then(async ([credentials, assignments, members, foods, consents]) => {
        if (!active) return;
        const studentIds =
          nutrition && clinicalRole
            ? authorizedNutritionStudentIds(
                context.userId,
                members,
                credentials,
                assignments,
                consents,
              )
            : new Set<string>();
        const scopedPlans = await Promise.all(
          [...studentIds].map(async (studentId) => {
            const plans = await api.getMealPlans(context.tenantId, studentId);
            return plans.filter((plan) => plan.student === studentId);
          }),
        );
        const plans = scopedPlans.flat();
        if (active)
          setSnapshot({
            scope,
            data: { credentials, assignments, members, plans, foods, consents },
          });
      })
      .catch((e) => {
        if (active)
          setFailure({
            scope,
            message:
              e instanceof Error ? e.message : "Falha ao carregar registros.",
          });
      });
    return () => {
      active = false;
    };
  }, [
    api,
    mode,
    context.tenantId,
    isAdmin,
    scope,
    nutrition,
    clinicalRole,
    context.userId,
  ]);
  const data = snapshot?.scope === scope ? snapshot.data : empty;
  const sessionPlans = app.demoNutrition[context.tenantId] ?? [];
  const demoFoods =
    mode === "demo" ? app.repository.getFoods(context).map(demoFoodRecord) : [];
  const demoPlans =
    mode === "demo"
      ? [
          ...app.repository
            .getMealPlans(context)
            .map(demoMealPlanRecord)
            .filter(
              (plan) => !sessionPlans.some((item) => item.id === plan.id),
            ),
          ...sessionPlans,
        ]
      : [];
  const credential = data.credentials.find(
    (c) =>
      c.professional === app.user.id &&
      c.kind === "crn" &&
      c.verified_at &&
      c.registration_number.trim() &&
      c.state.trim(),
  );
  const user =
    mode === "demo"
      ? app.user
      : {
          ...app.user,
          nutritionRegistration: credential
            ? {
                crn: credential.registration_number,
                uf: credential.state,
                status: "verified" as const,
              }
            : undefined,
        };
  const students =
    mode === "demo"
      ? app.repository.getStudents(context)
      : isAdmin
        ? app.repository.getStudents(context).map((s) => ({
            ...s,
            dietitianIds: data.assignments
              .filter((a) => a.student === s.id && a.is_active)
              .map((a) => a.dietitian),
            nutritionConsent: data.consents.some(
              (c) =>
                c.subject === s.id &&
                c.purpose === "nutrition_plan" &&
                c.granted &&
                !c.revoked_at,
            ),
          }))
        : [];
  const clinicalStudents = students.filter((student) =>
    canPublishMealPlan(user, membership, student),
  );
  const readableStudentIds = new Set(
    clinicalStudents.map((student) => student.id),
  );
  return {
    ...app,
    user,
    students: nutrition ? clinicalStudents : students,
    isAdmin,
    data: {
      ...data,
      foods: mode === "demo" ? demoFoods : data.foods,
      plans: (mode === "demo" ? demoPlans : data.plans).filter((plan) =>
        readableStudentIds.has(plan.student),
      ),
    },
    error: failure?.scope === scope ? failure.message : "",
    loading:
      mode === "api" &&
      isAdmin &&
      !!context.tenantId &&
      snapshot?.scope !== scope &&
      failure?.scope !== scope,
    refresh: () => setRevision((r) => r + 1),
    scopeError:
      mode === "api" && !isAdmin
        ? "Carteira indisponível: o servidor ainda não fornece vínculos e credenciais autorizados para este perfil. Dados de alunos permanecem bloqueados."
        : "",
  };
}
