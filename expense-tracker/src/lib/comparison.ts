import type { MonthKey } from "./date";
import type { CategoryMonthTotal } from "./types";

export type ComparisonRow = {
  category: string;
  /** Gasto por mes, alineado con `Comparison.months` (0 en los meses sin gasto). */
  values: number[];
  total: number;
};

export type Comparison = {
  months: MonthKey[];
  /** Categorías con gasto en el intervalo, de mayor a menor total. */
  rows: ComparisonRow[];
  /** Gasto total de todas las categorías por mes. */
  monthTotals: number[];
};

/** Evita restos de punto flotante al sumar decimales (0.1 + 0.2). */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Cambio relativo entre dos meses (0.25 = +25 %). Devuelve `null` cuando no hay
 * base de comparación (el mes anterior no tuvo gasto).
 */
export function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * Ordena los totales por mes y categoría en una matriz categoría × mes,
 * rellenando con 0 los meses sin gasto. Ignora datos fuera de `months`.
 */
export function buildComparison(data: CategoryMonthTotal[], months: MonthKey[]): Comparison {
  const monthIndex = new Map(months.map((m, i) => [m, i]));
  const byCategory = new Map<string, number[]>();

  for (const { month, category, amount } of data) {
    const index = monthIndex.get(month);
    if (index === undefined) continue;
    const values = byCategory.get(category) ?? months.map(() => 0);
    values[index] += amount;
    byCategory.set(category, values);
  }

  const rows = Array.from(byCategory, ([category, values]) => {
    const rounded = values.map(roundCents);
    return { category, values: rounded, total: roundCents(rounded.reduce((a, b) => a + b, 0)) };
  }).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const monthTotals = months.map((_, i) => roundCents(rows.reduce((sum, r) => sum + r.values[i], 0)));

  return { months, rows, monthTotals };
}

export type CategoryStats = {
  total: number;
  average: number;
  /** Mes de mayor gasto; `null` si no hubo gasto en todo el intervalo. */
  peak: { month: MonthKey; amount: number } | null;
  /** Cambio del último mes frente al anterior; `null` si no hay base (un solo mes o anterior en 0). */
  lastChange: number | null;
};

/** Cifras resumen de una sola categoría a partir de sus valores por mes. */
export function categoryStats(months: MonthKey[], values: number[]): CategoryStats {
  const total = roundCents(values.reduce((a, b) => a + b, 0));
  const average = months.length ? roundCents(total / months.length) : 0;

  let peak: CategoryStats["peak"] = null;
  values.forEach((amount, i) => {
    if (amount > 0 && (peak === null || amount > peak.amount)) peak = { month: months[i], amount };
  });

  const last = values.length - 1;
  const lastChange = last >= 1 ? percentChange(values[last - 1], values[last]) : null;

  return { total, average, peak, lastChange };
}
