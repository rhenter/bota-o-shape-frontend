import { describe, expect, it } from "vitest";
import { foods } from "./demo-data";
import { calculateNutrientsPerPortion, demoFoodSnapshot } from "./nutrition";

describe("calculateNutrientsPerPortion", () => {
  it("scales the recorded nutrients per 100 g to edible grams", () => {
    expect(
      calculateNutrientsPerPortion(
        { energyKcal: 120, proteinG: 8, fatG: 2 },
        150,
      ),
    ).toEqual({ energyKcal: 180, proteinG: 12, fatG: 3 });
  });

  it("preserves missing values and known zeroes", () => {
    expect(
      calculateNutrientsPerPortion(
        { energyKcal: 50, proteinG: null, fiberG: 0 },
        200,
      ),
    ).toEqual({ energyKcal: 100, proteinG: null, fiberG: 0 });
    expect(calculateNutrientsPerPortion({}, 200)).toEqual({});
    expect(calculateNutrientsPerPortion({ proteinG: undefined }, 200)).toEqual({
      proteinG: undefined,
    });
  });

  it("accepts zero grams without manufacturing absent nutrients", () => {
    expect(
      calculateNutrientsPerPortion({ energyKcal: 100, fiberG: null }, 0),
    ).toEqual({ energyKcal: 0, fiberG: null });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid grams: %s",
    (grams) => {
      expect(() =>
        calculateNutrientsPerPortion({ energyKcal: 100 }, grams),
      ).toThrow(RangeError);
    },
  );
});

describe("demoFoodSnapshot", () => {
  it("keeps unknown nutrients out of the snapshot instead of writing zero", () => {
    const snapshot = demoFoodSnapshot(foods[0], 100);
    expect(snapshot.nutrients.energy_kcal.value).toBe("120");
    expect(snapshot.nutrients.protein_g.value).toBe("2.5");
    expect(snapshot.nutrients.fiber_g).toBeUndefined();
    expect(snapshot.nutrients.total_carbohydrate_g).toBeUndefined();
    expect(snapshot.source).toBe("internal");
    expect(snapshot.preparation_state).toBe("Cozido");
  });
});
