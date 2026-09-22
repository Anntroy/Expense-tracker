import { describe, expect, it } from "vitest";
import { mergeCategories, suggestedCategories } from "./categories";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVING_CATEGORIES } from "./types";

describe("suggestedCategories", () => {
  it("starts with the fixed categories of the chosen type", () => {
    expect(suggestedCategories("expense", [])).toEqual(EXPENSE_CATEGORIES);
    expect(suggestedCategories("income", [])).toEqual(INCOME_CATEGORIES);
    expect(suggestedCategories("saving", [])).toEqual(SAVING_CATEGORIES);
  });

  it("adds the categories already used that are not fixed, after the fixed ones", () => {
    const result = suggestedCategories("expense", ["Mascotas", "Regalos"]);
    expect(result).toEqual([...EXPENSE_CATEGORIES, "Mascotas", "Regalos"]);
  });

  it("does not repeat fixed or already listed categories", () => {
    const result = suggestedCategories("expense", ["Comida", "Mascotas", "Mascotas"]);
    expect(result).toEqual([...EXPENSE_CATEGORIES, "Mascotas"]);
  });

  it("keeps each type's categories apart", () => {
    expect(suggestedCategories("saving", ["Vacaciones"])).toEqual(SAVING_CATEGORIES);
    expect(suggestedCategories("saving", ["Comida"])).toContain("Comida");
    expect(suggestedCategories("income", [])).not.toContain("Vivienda");
  });
});

describe("mergeCategories", () => {
  it("joins every source without repeats, sorted alphabetically", () => {
    expect(mergeCategories(["Vivienda", "Comida"], ["Comida", "Mascotas"], ["Ocio"])).toEqual([
      "Comida",
      "Mascotas",
      "Ocio",
      "Vivienda",
    ]);
  });

  it("sorts accented names with the Spanish collation", () => {
    expect(mergeCategories(["Óptica", "Ocio", "Zapatos", "Ángel"])).toEqual(["Ángel", "Ocio", "Óptica", "Zapatos"]);
  });

  it("returns an empty list when every source is empty", () => {
    expect(mergeCategories([], [])).toEqual([]);
  });
});
