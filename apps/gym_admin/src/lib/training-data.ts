import type {
  ApiAssessment,
  ApiConsent,
  ApiMeasurementProtocol,
  ApiWorkoutAssignment,
  ApiWorkoutSession,
  ApiWorkoutTemplate,
} from "./api-client";
import type { DemoRepository } from "./demo-repository";
import type { RepositoryContext } from "./domain";
export interface TrainingData {
  templates: ApiWorkoutTemplate[];
  assignments: ApiWorkoutAssignment[];
  sessions: ApiWorkoutSession[];
  protocols: ApiMeasurementProtocol[];
  assessments: ApiAssessment[];
  consents: ApiConsent[];
}
export const emptyTrainingData: TrainingData = {
  templates: [],
  assignments: [],
  sessions: [],
  protocols: [],
  assessments: [],
  consents: [],
};
export function demoTrainingData(
  repository: Omit<DemoRepository, "mode">,
  context: RepositoryContext,
): TrainingData {
  const templates: ApiWorkoutTemplate[] = repository
    .getWorkouts(context)
    .map((item) => ({
      id: item.id,
      name: item.name,
      objective: item.goal,
      level: "Demonstração",
      notes: "Ficha fictícia",
      version: item.version,
      status: item.status,
      supersedes: null,
      published_at: null,
      days: [
        {
          name: "Treino A",
          order: 1,
          exercises: item.exercises.map((exercise, index) => ({
            id: exercise.id,
            exercise: exercise.exerciseId,
            order: index + 1,
            variant: null,
            alternative: null,
            coach_observation: exercise.coachObservation,
            sets: exercise.sets.map((set, i) => ({
              id: set.id,
              order: i + 1,
              repetitions_min: null,
              repetitions_max: null,
              load_kg: set.loadKg?.toString() ?? null,
              duration_seconds: set.durationSeconds ?? null,
              distance_meters: set.distanceMeters?.toString() ?? null,
              rest_seconds: set.restSeconds,
              rpe: null,
              rir: null,
              cadence: "",
              note: [set.repetitions, set.note].filter(Boolean).join(" · "),
            })),
          })),
        },
      ],
    }));
  const assessments: ApiAssessment[] = repository
    .getAssessments(context)
    .map((item) => ({
      id: item.id,
      student: item.studentId,
      consent: "demo-consent",
      assessed_at: item.assessedAt,
      status: item.released ? "released" : "draft",
      released_at: item.released ? item.assessedAt : null,
      device: { description: item.device ?? "" },
      preparation_conditions: { notes: item.conditions },
      notes: item.notes,
      measurements: item.measurements
        .filter((m) => m.value !== null)
        .map((m, i) => ({
          id: `${item.id}-${i}`,
          metric: m.name,
          raw_value: String(m.value),
          unit: m.unit,
          side: m.side ?? "",
          anatomical_site: m.anatomicalPoint ?? "",
          method: item.method,
          protocol: "demo-circumference",
          origin: "demo",
          equation_metadata: {},
          possible_error: false,
        })),
    }));
  return {
    templates,
    assignments: [],
    sessions: [],
    assessments,
    protocols:
      context.tenantId && templates.length
        ? [
            {
              id: "demo-circumference",
              name: "Perímetros · exemplo fictício",
              version: "1",
              method: "circumference",
              sites: ["Cintura"],
              equation_metadata: {},
              is_active: true,
            },
          ]
        : [],
    consents: repository
      .getStudents(context)
      .map((student) => ({
        id: `demo-consent-${student.id}`,
        subject: student.id,
        purpose: "Avaliação · exemplo fictício",
        granted: true,
        granted_at: "2026-10-10T12:00:00Z",
        revoked_at: null,
        evidence: {},
      })),
  };
}
