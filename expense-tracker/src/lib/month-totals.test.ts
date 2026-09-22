import { describe, expect, it } from "vitest";
import { monthTotals } from "./month-totals";
import type { Transaction } from "./types";

let nextId = 1;
function tx(type: Transaction["type"], amount: number, excluded = false): Transaction {
  return { id: nextId++, type, category: "X", amount, description: "", date: "2026-09-10", excluded, memberId: null };
}

describe("monthTotals", () => {
  it("adds income, expenses and savings separately", () => {
    const totals = monthTotals([tx("income", 1800), tx("expense", 300), tx("expense", 50), tx("saving", 200)]);
    expect(totals).toMatchObject({ income: 1800, expenses: 350, savings: 200 });
  });

  it("the balance is income minus expenses minus savings", () => {
    expect(monthTotals([tx("income", 1800), tx("expense", 801.5), tx("saving", 200)]).balance).toBe(798.5);
  });

  it("savings are not expenses, but they do reduce what is left", () => {
    const withSavings = monthTotals([tx("income", 1000), tx("saving", 300)]);
    expect(withSavings.expenses).toBe(0);
    expect(withSavings.balance).toBe(700);
  });

  it("ignores deactivated transactions of every type", () => {
    const totals = monthTotals([
      tx("income", 1000),
      tx("income", 500, true),
      tx("expense", 200, true),
      tx("saving", 100, true),
    ]);
    expect(totals).toEqual({ income: 1000, expenses: 0, savings: 0, balance: 1000 });
  });

  it("can be negative when spending and saving more than what comes in", () => {
    expect(monthTotals([tx("income", 100), tx("expense", 80), tx("saving", 50)]).balance).toBe(-30);
  });

  it("returns zeros for an empty month", () => {
    expect(monthTotals([])).toEqual({ income: 0, expenses: 0, savings: 0, balance: 0 });
  });

  it("does not leak floating-point noise when adding decimals", () => {
    const totals = monthTotals([tx("expense", 0.1), tx("expense", 0.2), tx("income", 0.3)]);
    expect(totals.expenses).toBe(0.3);
    expect(totals.balance).toBe(0);
  });
});
