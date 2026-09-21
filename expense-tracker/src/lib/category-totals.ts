import type { Transaction } from "./types";

export type CategoryTotal = { category: string; amount: number };

/** Gastos agrupados por categoría, de mayor a menor. */
export function expenseTotalsByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || t.excluded) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );
}
