// Frontend view models for demo mode; these are not an API contract.
export type Role = "professor" | "nutritionist" | "admin" | "student";
export type Permission = "billing.manage";

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  cnpj: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  nutritionRegistration?: {
    crn: string;
    uf: string;
    status: "pending" | "verified" | "rejected";
  };
}

export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  status: "active" | "inactive";
  roles: readonly Role[];
  permissions: readonly Permission[];
}

export interface RepositoryContext {
  userId: string;
  tenantId: string;
}

export interface TenantRecord {
  id: string;
  tenantId: string;
}

export interface Student extends TenantRecord {
  membershipId?: string;
  name: string;
  email: string;
  status: "active" | "archived" | "inactive" | "invited";
  coachIds: readonly string[];
  dietitianIds: readonly string[];
  nutritionConsent: boolean;
  goal?: string;
  restrictions?: string;
}

export interface Equipment extends TenantRecord {
  description?: string;
  name: string;
  location: string;
  status: "available" | "maintenance" | "inactive";
}

export interface Exercise extends TenantRecord {
  name: string;
  primaryMuscle: string;
  secondaryMuscles: readonly string[];
  equipmentIds: readonly string[];
  recordType: "load_reps" | "bodyweight_reps" | "duration" | "distance" | "activity";
  preparation: string;
  instructions: readonly string[];
  breathing: string;
  commonMistakes: readonly string[];
  status: "draft" | "in_review" | "approved" | "reviewed" | "archived";
}

export interface SetPrescription {
  id: string;
  repetitions?: string;
  loadKg?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  restSeconds: number;
  note?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  coachObservation: string;
  sets: readonly SetPrescription[];
}

export interface Workout extends TenantRecord {
  name: string;
  goal: string;
  version: number;
  status: "draft" | "published";
  exercises: readonly WorkoutExercise[];
  studentIds: readonly string[];
}

export interface Measurement {
  name: string;
  value: number | null;
  unit: string;
  anatomicalPoint?: string;
  side?: "left" | "right";
}

export interface Assessment extends TenantRecord {
  studentId: string;
  assessedAt: string;
  assessorId: string;
  method: "circumference" | "skinfold" | "bioimpedance";
  protocol: string;
  device?: string;
  conditions: string;
  measurements: readonly Measurement[];
  released: boolean;
  notes: string;
}

// null/undefined means "Não informado"; a known zero remains zero.
export interface Nutrients {
  energyKcal?: number | null;
  proteinG?: number | null;
  availableCarbohydrateG?: number | null;
  totalCarbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}

export interface FoodCatalogItem extends TenantRecord {
  name: string;
  preparation: string;
  source: "TBCA" | "USDA" | "demo";
  sourceId: string;
  sourceVersion: string;
  dataType: "analyzed" | "label" | "demo";
  nutrientsPer100g: Nutrients;
  portions: readonly { name: string; grams: number; reference: string }[];
}

export interface PlannedFood {
  id: string;
  foodId: string;
  grams: number;
  instruction: string;
  substitutions: readonly string[];
  snapshot: {
    source: FoodCatalogItem["source"];
    sourceVersion: string;
    nutrientsPer100g: Nutrients;
  };
}

export interface MealPlan extends TenantRecord {
  studentId: string;
  authorId: string;
  authorCrn: string;
  authorUf: string;
  name: string;
  version: number;
  status: "draft" | "published" | "paused" | "expired";
  startsAt: string;
  reviewAt: string;
  changeSummary: string;
  meals: readonly { id: string; name: string; time: string; foods: readonly PlannedFood[] }[];
}

export interface AcademySubscription extends TenantRecord {
  status: "pilot" | "active" | "pending" | "overdue" | "scheduled_cancellation" | "cancelled" | "suspended";
  planName: string;
  billingContact: string;
  periodEnd: string;
}
