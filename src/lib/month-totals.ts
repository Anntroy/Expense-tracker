import { roundCents } from "./money";
import type { Transaction } from "./types";

export type MonthTotals = {
  income: number;
  expenses: number;
  savings: number;
  /** Lo que queda disponible: ingresos - gastos - ahorro. */
  balance: number;
};

/**
 * Totales de una lista de movimientos. Los desactivados no cuentan. El ahorro es dinero
 * apartado: no es un gasto, pero tampoco queda disponible, así que resta del balance.
 */
export function monthTotals(transactions: Transaction[]): MonthTotals {
  const counted = transactions.filter((t) => !t.excluded);
  const total = (type: Transaction["type"]) =>
    roundCents(counted.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0));

  const income = total("income");
  const expenses = total("expense");
  const savings = total("saving");
  return { income, expenses, savings, balance: roundCents(income - expenses - savings) };
}
