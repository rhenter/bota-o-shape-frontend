import type { Nutrients } from "./domain";

export function calculateNutrientsPerPortion(per100g: Nutrients, edibleGrams: number): Nutrients {
  if (!Number.isFinite(edibleGrams) || edibleGrams < 0) {
    throw new RangeError("A quantidade em gramas deve ser finita e não negativa.");
  }

  return Object.fromEntries(
    Object.entries(per100g).map(([nutrient, value]) => [
      nutrient,
      value == null ? value : (value * edibleGrams) / 100,
    ]),
  );
}
