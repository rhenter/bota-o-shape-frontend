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
    tenant: string;
    data: TrainingData;
  }>();
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  const tenant = context.tenantId;
  useEffect(() => {
    if (mode !== "api" || !tenant) return;
    let active = true;
    Promise.all([
      api.getWorkoutTemplates(tenant),
      api.getWorkoutAssignments(tenant),
      api.getWorkoutSessions(tenant),
      api.getAssessmentProtocols(tenant),
      api.getAssessments(tenant),
      api.getConsents(tenant),
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
              tenant,
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
  }, [api, mode, tenant, revision]);
  const data =
    mode === "demo"
      ? (demoTraining[tenant] ?? demoTrainingData(repository, context))
      : snapshot?.tenant === tenant
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
    trainingLoading: mode === "api" && !failure && snapshot?.tenant !== tenant,
    canWrite: Boolean(
      app.membership?.roles.some(
        (role) => role === "admin" || role === "professor",
      ),
    ),
  };
}
