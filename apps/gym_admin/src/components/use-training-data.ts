"use client";
import { useEffect, useState } from "react";
import { useAppContext } from "./app-context";
import {
  demoTrainingData,
  emptyTrainingData,
  type TrainingData,
} from "@/lib/training-data";

export function useTrainingData() {
  const app = useAppContext();
  const { api, mode, context, repository, demoTraining, setDemoTraining } = app;
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: TrainingData;
  }>();
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  const tenant = context.tenantId;
  const activeMembership =
    app.membership?.status === "active" &&
    app.membership.tenantId === tenant &&
    app.membership.userId === context.userId;
  // Owner is mapped to admin by the authenticated app-context adapter.
  const canReadTenantStudents =
    activeMembership && Boolean(app.membership?.roles.includes("admin"));
  const scope = `${tenant}:${context.userId}:${canReadTenantStudents ? "admin" : "professional"}`;
  const studentScopeError =
    mode === "api" && !canReadTenantStudents
      ? "Acompanhamento indisponível: a API ainda não fornece uma relação autorizada de alunos vinculados ao profissional. Dados e ações de alunos permanecem bloqueados neste perfil."
      : "";
  useEffect(() => {
    if (mode !== "api" || !tenant || !activeMembership) return;
    let active = true;
    Promise.all([
      api.getWorkoutTemplates(tenant),
      canReadTenantStudents
        ? api.getWorkoutAssignments(tenant)
        : Promise.resolve([]),
      canReadTenantStudents
        ? api.getWorkoutSessions(tenant)
        : Promise.resolve([]),
      api.getAssessmentProtocols(tenant),
      canReadTenantStudents ? api.getAssessments(tenant) : Promise.resolve([]),
      canReadTenantStudents ? api.getConsents(tenant) : Promise.resolve([]),
    ])
      .then(
        ([
          templates,
          assignments,
          sessions,
          protocols,
          assessments,
          consents,
        ]) => {
          if (active) {
            setFailure("");
            setSnapshot({
              scope,
              data: {
                templates,
                assignments,
                sessions,
                protocols,
                assessments,
                consents,
              },
            });
          }
        },
      )
      .catch((error) => {
        if (active)
          setFailure(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os registros.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    api,
    mode,
    tenant,
    scope,
    activeMembership,
    canReadTenantStudents,
    revision,
  ]);
  const data =
    mode === "demo"
      ? (demoTraining[tenant] ?? demoTrainingData(repository, context))
      : snapshot?.scope === scope
        ? snapshot.data
        : emptyTrainingData;
  function updateDemo(update: (data: TrainingData) => TrainingData) {
    setDemoTraining((items) => ({
      ...items,
      [tenant]: update(items[tenant] ?? data),
    }));
  }
  return {
    ...app,
    data,
    updateDemo,
    refreshTraining: () => setRevision((value) => value + 1),
    trainingError: failure,
    studentDataError: failure || studentScopeError,
    trainingLoading: mode === "api" && !failure && snapshot?.scope !== scope,
    canWrite: Boolean(
      app.membership?.roles.some(
        (role) => role === "admin" || role === "professor",
      ),
    ),
  };
}
