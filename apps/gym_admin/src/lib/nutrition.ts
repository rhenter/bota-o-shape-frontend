import type { FoodSnapshot } from "./admin-contracts";
import type { FoodCatalogItem, MealPlan, Nutrients } from "./domain";

export function calculateNutrientsPerPortion(
  per100g: Nutrients,
  edibleGrams: number,
): Nutrients {
  if (!Number.isFinite(edibleGrams) || edibleGrams < 0) {
    throw new RangeError(
      "A quantidade em gramas deve ser finita e não negativa.",
    );
  }

  return Object.fromEntries(
    Object.entries(per100g).map(([nutrient, value]) => [
      nutrient,
      value == null ? value : (value * edibleGrams) / 100,
    ]),
  );
}

const nutrientLabels: Record<
  keyof Nutrients,
  { code: string; name: string; unit: string }
> = {
  energyKcal: { code: "energy_kcal", name: "Energia", unit: "kcal" },
  proteinG: { code: "protein_g", name: "Proteínas", unit: "g" },
  availableCarbohydrateG: {
    code: "available_carbohydrate_g",
    name: "Carboidratos disponíveis",
    unit: "g",
  },
  totalCarbohydrateG: {
    code: "total_carbohydrate_g",
    name: "Carboidratos totais",
    unit: "g",
  },
  fatG: { code: "fat_g", name: "Gorduras", unit: "g" },
  fiberG: { code: "fiber_g", name: "Fibras", unit: "g" },
};

export function demoFoodRecord(food: FoodCatalogItem) {
  return {
    id: food.id,
    name: food.name,
    preparation_state: food.preparation,
    external_id: food.sourceId,
    edible_description: "",
    branded: food.dataType === "label",
    reviewed: false,
    source: {
      id: food.sourceId,
      name: food.source === "demo" ? "Demonstração" : food.source,
      kind:
        food.source === "TBCA"
          ? ("tbca" as const)
          : food.source === "USDA"
            ? ("usda" as const)
            : ("internal" as const),
      version: food.sourceVersion,
      attribution_url: "",
      license_status: food.dataType === "demo" ? "demo" : "pending_review",
      is_active: true,
    },
    household_measures: food.portions.map((portion, index) => ({
      id: `${food.id}-${index}`,
      name: portion.name,
      grams: String(portion.grams),
      evidence: portion.reference,
    })),
  };
}

export function demoMealPlanRecord(plan: MealPlan) {
  const status =
    plan.status === "paused"
      ? ("paused" as const)
      : plan.status === "published"
        ? ("published" as const)
        : plan.status === "expired"
          ? ("superseded" as const)
          : ("draft" as const);
  return {
    id: plan.id,
    student: plan.studentId,
    objective: plan.name,
    starts_on: plan.startsAt.slice(0, 10),
    ends_on: null,
    review_on: plan.reviewAt.slice(0, 10),
    status,
    versions: [
      {
        id: `${plan.id}-v${plan.version}`,
        version: plan.version,
        crn: plan.authorCrn,
        crn_state: plan.authorUf,
        published_at: status === "published" ? plan.startsAt : null,
        change_reason: plan.changeSummary,
        hydration_guidance: "",
        complementary_guidance: "",
        meal_slots: plan.meals.map((meal, order) => ({
          day: 1,
          name: meal.name,
          scheduled_time: meal.time || null,
          order: order + 1,
          instructions: "",
          foods: meal.foods.map((food) => ({
            food: food.foodId,
            description: food.foodId,
            quantity: String(food.grams),
            unit: "g",
            grams: String(food.grams),
            preparation: food.instruction,
            observation: "",
            substitutions: food.substitutions.map((description) => ({
              description,
              unit: "",
            })),
          })),
        })),
      },
    ],
  };
}

export function demoFoodSnapshot(
  food: FoodCatalogItem,
  grams: number,
): FoodSnapshot {
  const portion = calculateNutrientsPerPortion(food.nutrientsPer100g, grams);
  const nutrients: FoodSnapshot["nutrients"] = {};
  for (const key of Object.keys(nutrientLabels) as (keyof Nutrients)[]) {
    const value = portion[key];
    if (value == null) continue;
    const label = nutrientLabels[key];
    nutrients[label.code] = {
      name: label.name,
      value: String(value),
      unit: label.unit,
      per_100g: String(food.nutrientsPer100g[key] ?? ""),
    };
  }
  return {
    food_id: food.id,
    description: food.name,
    preparation_state: food.preparation,
    grams: String(grams),
    source:
      food.source === "TBCA"
        ? "tbca"
        : food.source === "USDA"
          ? "usda"
          : "internal",
    source_version: food.sourceVersion,
    external_id: food.sourceId,
    estimated: true,
    nutrients,
  };
}
