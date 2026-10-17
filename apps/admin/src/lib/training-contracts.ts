// Field names and decimal strings follow Django serializers/OpenAPI.
export interface ApiSetPrescription {
  id?: string;
  order: number;
  repetitions_min: number | null;
  repetitions_max: number | null;
  load_kg: string | null;
  duration_seconds: number | null;
  distance_meters: string | null;
  rest_seconds: number | null;
  rpe: string | null;
  rir: number | null;
  cadence: string;
  note: string;
}
export interface ApiWorkoutExercise {
  id?: string;
  exercise_name?: string;
  exercise: string;
  variant: string | null;
  alternative: string | null;
  order: number;
  coach_observation: string;
  sets: ApiSetPrescription[];
}
export interface ApiWorkoutDay {
  id?: string;
  name: string;
  order: number;
  exercises: ApiWorkoutExercise[];
}
export interface WorkoutTemplateInput {
  name: string;
  objective: string;
  level: string;
  notes: string;
  days: ApiWorkoutDay[];
}
export interface ApiWorkoutTemplate extends WorkoutTemplateInput {
  id: string;
  version: number;
  status: "draft" | "published" | "archived";
  supersedes: string | null;
  published_at: string | null;
}
export interface WorkoutAssignmentInput {
  template: string;
  student: string;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
}
export interface ApiWorkoutAssignment extends WorkoutAssignmentInput {
  id: string;
  template_detail: ApiWorkoutTemplate;
}
export interface ApiSetLog {
  id: string;
  prescription: string | null;
  repetitions: number | null;
  load_kg: string | null;
  duration_seconds: number | null;
  distance_meters: string | null;
  rpe: string | null;
}
export interface ApiExerciseLog {
  id: string;
  workout_exercise: string;
  skipped: boolean;
  note: string;
  set_logs: ApiSetLog[];
}
export interface ApiWorkoutSession {
  id: string;
  assignment: string;
  idempotency_key: string;
  started_at: string;
  completed_at: string | null;
  student_note: string;
  exercise_logs: ApiExerciseLog[];
}
export interface ApiMeasurementProtocol {
  id: string;
  name: string;
  version: string;
  method: string;
  sites: unknown;
  equation_metadata: unknown;
  is_active: boolean;
}
export interface ApiMeasurement {
  id?: string;
  metric: string;
  raw_value: string;
  unit: string;
  side: string;
  anatomical_site: string;
  method: string;
  protocol: string | null;
  origin: string;
  equation_metadata: Record<string, unknown>;
  possible_error: boolean;
}
export type AssessmentStatus = "draft" | "reviewed" | "completed" | "released";
export interface AssessmentInput {
  student: string;
  consent: string;
  assessed_at: string;
  device: Record<string, unknown>;
  preparation_conditions: Record<string, unknown>;
  notes: string;
  measurements: ApiMeasurement[];
}
export interface ApiAssessment extends AssessmentInput {
  id: string;
  status: AssessmentStatus;
  released_at: string | null;
}
export interface ApiComparison {
  measurement_id: string;
  previous_measurement_id?: string;
  comparison_status: "not_comparable" | "increased" | "decreased" | "unchanged";
  difference?: string;
  difference_percent?: string | null;
}
export interface ApiAssessmentReport {
  id: string;
  assessment: string;
  comparisons: ApiComparison[];
  professional_interpretation: string;
  released_to_student: boolean;
}
export interface ApiConsent {
  id: string;
  subject: string;
  purpose: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
  evidence: unknown;
}
