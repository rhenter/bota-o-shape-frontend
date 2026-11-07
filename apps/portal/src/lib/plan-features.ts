import type { Messages } from "@/i18n/pt-BR";
import type { Plan } from "@/lib/api";

const START_FEATURES = new Set(["student_app", "workouts", "assessments"]);
const PRO_FEATURES = new Set([
  ...START_FEATURES,
  "nutrition",
  "reports_metrics",
  "priority_support",
]);

type PlanCopy = Messages["plans"];

/** Commercial feature lines. Pro and Enterprise collapse inherited items into one line. */
export function visiblePlanFeatures(plan: Plan, copy: PlanCopy): string[] {
  const inherited = plan.code === "pro"
    ? copy.inheritedFeatures.pro
    : plan.code === "enterprise"
      ? copy.inheritedFeatures.enterprise
      : null;
  const inheritedKeys = plan.code === "pro" ? START_FEATURES : plan.code === "enterprise" ? PRO_FEATURES : null;
  const ownFeatures = inheritedKeys
    ? plan.features.filter((feature) => !inheritedKeys.has(feature))
    : plan.features;
  const labels = ownFeatures.map((feature) => copy.featureNames[feature as keyof PlanCopy["featureNames"]] ?? feature);
  return inherited ? [inherited, ...labels] : labels;
}
