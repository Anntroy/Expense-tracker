import { EXPENSE_CATEGORIES } from "./types";

/**
 * Un color fijo por categoría (no por posición en el gráfico), para que una
 * categoría no cambie de color según qué otras categorías tenga al lado ese
 * mes. Los valores de las categorías fijas vienen de la paleta categórica
 * validada de la skill de dataviz del proyecto — ver globals.css para
 * --series-1..6.
 */
const CATEGORY_COLOR_VARS = EXPENSE_CATEGORIES.reduce<Record<string, string>>(
  (acc, category, index) => {
    acc[category] = `var(--series-${index + 1})`;
    return acc;
  },
  {},
);

/**
 * Categorías propias: cada categoría nueva recibe el siguiente color de una
 * secuencia (matiz que avanza el ángulo áureo, así los vecinos siempre quedan
 * bien separados). La asignación se guarda en localStorage para que una
 * categoría conserve su color entre sesiones. Saturación y luminosidad salen
 * de --extra-s/--extra-l en globals.css, para que se adapten al tema.
 */
const STORAGE_KEY = "expense-tracker:category-colors";
const GOLDEN_ANGLE = 137.508;
const BASE_HUE = 20;

let customIndexes: Record<string, number> | null = null;

function loadCustomIndexes(): Record<string, number> {
  if (customIndexes) return customIndexes;
  customIndexes = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) customIndexes = JSON.parse(raw) as Record<string, number>;
  } catch {
    // Sin localStorage (o JSON corrupto): se reasignan en memoria.
  }
  return customIndexes;
}

function customColor(category: string): string {
  const indexes = loadCustomIndexes();
  if (!(category in indexes)) {
    const used = Object.values(indexes);
    indexes[category] = used.length ? Math.max(...used) + 1 : 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(indexes));
    } catch {
      // Ignorar: el color vale para esta sesión.
    }
  }
  const hue = Math.round((BASE_HUE + indexes[category] * GOLDEN_ANGLE) % 360);
  return `hsl(${hue} var(--extra-s) var(--extra-l))`;
}

export function categoryColor(category: string): string {
  return CATEGORY_COLOR_VARS[category] ?? customColor(category);
}
