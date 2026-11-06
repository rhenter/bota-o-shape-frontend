export interface ApiCredential {
  id: string;
  professional: string;
  kind: "crn" | "cref";
  registration_number: string;
  state: string;
  verified_at: string | null;
}
export interface ApiDietitianAssignment {
  id: string;
  dietitian: string;
  student: string;
  is_active: boolean;
}
export interface ApiFoodSource {
  id: string;
  name: string;
  kind: "tbca" | "usda" | "internal";
  version: string;
  attribution_url: string;
  license_status: string;
  is_active: boolean;
}
export interface ApiFood {
  id: string;
  name: string;
  preparation_state: string;
  external_id: string;
  edible_description: string;
  branded: boolean;
  reviewed: boolean;
  source: ApiFoodSource;
  household_measures: {
    id: string;
    name: string;
    grams: string;
    evidence: string;
  }[];
}
export interface FoodSnapshot {
  food_id: string;
  description: string;
  preparation_state: string;
  grams: string;
  source: string;
  source_version: string;
  external_id: string;
  estimated: boolean;
  nutrients: Record<
    string,
    { name: string; value: string; unit: string; per_100g: string }
  >;
}
export interface PlannedFoodInput {
  food?: string | null;
  description: string;
  quantity?: string | null;
  unit: string;
  grams?: string | null;
  preparation: string;
  observation: string;
  substitutions: {
    description: string;
    unit: string;
    food?: string | null;
    grams?: string | null;
  }[];
}
export interface MealSlotInput {
  day: number;
  name: string;
  scheduled_time: string | null;
  order: number;
  instructions: string;
  foods: PlannedFoodInput[];
}
export interface MealVersionInput {
  change_reason: string;
  hydration_guidance: string;
  complementary_guidance: string;
  meal_slots: MealSlotInput[];
}
export interface ApiMealVersion extends MealVersionInput {
  id: string;
  version: number;
  crn: string;
  crn_state: string;
  published_at: string | null;
}
export interface MealPlanInput {
  student: string;
  objective: string;
  starts_on: string;
  ends_on: string | null;
  review_on: string | null;
  draft: MealVersionInput;
}
export interface ApiMealPlan extends Omit<MealPlanInput, "draft"> {
  id: string;
  status: "draft" | "published" | "paused" | "superseded";
  versions: ApiMealVersion[];
}
export interface ApiBillingPlan {
  id: string;
  name: string;
  features: string[];
  limits: Record<string, number>;
  price_reference: string;
}
export type SubscriptionStatus =
  | "pilot"
  | "trial"
  | "active"
  | "past_due"
  | "delinquent"
  | "cancel_scheduled"
  | "cancelled"
  | "suspended";
export interface ApiSubscription {
  id: string;
  status: SubscriptionStatus;
  plan_detail: ApiBillingPlan;
  billing_cycle: string;
  provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  cancel_at: string | null;
  billing_details: Record<string, unknown>;
}
export interface ApiInvoice {
  id: string;
  subscription: string;
  status: string;
  currency: string;
  amount_minor: number;
  due_at: string | null;
  hosted_url: string;
}
export interface ApiEntitlement {
  id: string;
  key: string;
  enabled: boolean;
  limit: number | null;
  source: string;
}
export interface ApiUnit {
  id: string;
  name: string;
  address: Record<string, unknown>;
  is_active: boolean;
}
export function hostedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
