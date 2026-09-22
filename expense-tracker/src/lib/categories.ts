import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVING_CATEGORIES, type TransactionType } from "./types";

export const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  saving: SAVING_CATEGORIES,
};

/** Sugerencias del formulario: las categorías fijas del tipo y, detrás, las ya usadas que no son fijas. */
export function suggestedCategories(type: TransactionType, used: string[]): string[] {
  const base = CATEGORIES_BY_TYPE[type];
  const extra = Array.from(new Set(used)).filter((c) => !base.includes(c));
  return [...base, ...extra];
}

/** Opciones de un selector de categorías: las de todas las fuentes, sin repetir y por orden alfabético. */
export function mergeCategories(...sources: string[][]): string[] {
  return Array.from(new Set(sources.flat())).sort((a, b) => a.localeCompare(b));
}
