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
/** Feature flags as published by the billing plan version API. */
export type ApiPlanFeatures = Record<
  | "has_student_app"
  | "has_workouts"
  | "has_assessments"
  | "has_nutrition"
  | "has_reports_metrics"
  | "has_priority_support"
  | "has_multiple_units"
  | "has_landing_page"
  | "has_landing_page_custom",
  boolean
>;

/** Names of the features enabled in the `has_*` flag map. */
export function activePlanFeatureNames(features: ApiPlanFeatures | undefined): string[] {
  if (!features) return [];
  return Object.entries(features)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key.replace(/^has_/, ""));
}

export interface ApiBillingPlan {
  id: string;
  name?: string;
  version?: number;
  features: ApiPlanFeatures;
  limits: Record<string, number>;
  price_reference: string;
  monthly_price_minor?: number;
  currency?: string;
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
export interface ApiFiscalDocument {
  id: string;
  status: string;
  number: string;
  pdf_url: string;
  xml_url: string;
  error_message: string;
}
export interface ApiInvoice {
  id: string;
  subscription: string;
  status: string;
  currency: string;
  amount_minor: number;
  amount_paid_minor?: number;
  amount_refunded_minor?: number;
  fee_minor?: number | null;
  net_minor?: number | null;
  payment_method?: string;
  due_at: string | null;
  hosted_url: string;
  fiscal_document?: ApiFiscalDocument | null;
}
export interface ApiBillingCapabilities {
  provider: string | null;
  capabilities: Record<string, boolean>;
}
export interface ApiBillingOperation {
  id: string;
  operation_type: string;
  status: string;
  result_data?: { url?: string; provider_status?: string };
  error_message?: string;
}
export interface ApiEntitlement {
  id: string;
  key: string;
  enabled: boolean;
  limit: number | null;
  source: string;
}
export interface ApiUsageItem {
  key: string;
  used: number;
  limit: number | null;
}
export interface ApiUsage {
  items: ApiUsageItem[];
}
export interface ApiCatalogPlan {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  current_version: ApiBillingPlan | null;
}
export interface UnitAddress {
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}
export interface ApiUnit {
  id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  address: Partial<UnitAddress>;
  is_active: boolean;
  services: string[];
}
export type UnitInput = Pick<ApiUnit, "name" | "legal_name" | "tax_id" | "is_active" | "services"> & {
  address: UnitAddress;
};
export type LandingTheme = "lime" | "graphite" | "ocean" | "black" | "white";
export type LandingBackground =
  | "none"
  | "gym_floor"
  | "studio"
  | "outdoor"
  | "weights"
  | "machines"
  | "group_class"
  | "nutrition";
export interface ApiLandingPage {
  mode: "standard" | "custom";
  title: string;
  logo: string | null;
  phone: string;
  email: string;
  whatsapp: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  theme: LandingTheme;
  background: LandingBackground;
  slug: string | null;
  custom_domain: string;
  domain_verified: boolean;
}
export type LandingPageInput = Pick<
  ApiLandingPage,
  | "title"
  | "phone"
  | "email"
  | "whatsapp"
  | "instagram_url"
  | "facebook_url"
  | "youtube_url"
  | "theme"
  | "background"
  | "slug"
> & { custom_domain?: string };
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
