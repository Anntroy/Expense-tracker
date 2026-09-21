import { describe, expect, it } from "vitest";
import { buildComparison, categoryStats, percentChange } from "./comparison";

const months = ["2026-07", "2026-08", "2026-09"];

describe("buildComparison", () => {
  it("fills months without spending with 0", () => {
    const { rows } = buildComparison([{ month: "2026-08", category: "Comida", amount: 40 }], months);
    expect(rows).toEqual([{ category: "Comida", values: [0, 40, 0], total: 40 }]);
  });

  it("sorts categories by total, highest first", () => {
    const { rows } = buildComparison(
      [
        { month: "2026-07", category: "Ocio", amount: 10 },
        { month: "2026-07", category: "Vivienda", amount: 500 },
        { month: "2026-09", category: "Ocio", amount: 20 },
      ],
      months,
    );
    expect(rows.map((r) => r.category)).toEqual(["Vivienda", "Ocio"]);
    expect(rows[1].values).toEqual([10, 0, 20]);
  });

  it("breaks ties by category name so the order is stable", () => {
    const { rows } = buildComparison(
      [
        { month: "2026-07", category: "Zeta", amount: 5 },
        { month: "2026-07", category: "Alfa", amount: 5 },
      ],
      months,
    );
    expect(rows.map((r) => r.category)).toEqual(["Alfa", "Zeta"]);
  });

  it("ignores data outside the requested months", () => {
    const { rows } = buildComparison([{ month: "2026-01", category: "Comida", amount: 99 }], months);
    expect(rows).toEqual([]);
  });

  it("computes the total per month across categories", () => {
    const { monthTotals } = buildComparison(
      [
        { month: "2026-07", category: "Comida", amount: 10 },
        { month: "2026-07", category: "Ocio", amount: 5 },
        { month: "2026-09", category: "Comida", amount: 1 },
      ],
      months,
    );
    expect(monthTotals).toEqual([15, 0, 1]);
  });

  it("does not leak floating-point noise when adding decimals", () => {
    const { rows } = buildComparison(
      [
        { month: "2026-07", category: "Comida", amount: 0.1 },
        { month: "2026-07", category: "Comida", amount: 0.2 },
      ],
      months,
    );
    expect(rows[0].values[0]).toBe(0.3);
    expect(rows[0].total).toBe(0.3);
  });

  it("returns no rows for an empty interval of data", () => {
    const result = buildComparison([], months);
    expect(result.rows).toEqual([]);
    expect(result.monthTotals).toEqual([0, 0, 0]);
  });
});

describe("percentChange", () => {
  it("computes the relative change", () => {
    expect(percentChange(100, 125)).toBe(0.25);
    expect(percentChange(100, 50)).toBe(-0.5);
  });

  it("returns null when there is no base to compare against", () => {
    expect(percentChange(0, 30)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("categoryStats", () => {
  it("computes total, average, peak month and last change", () => {
    const stats = categoryStats(months, [100, 50, 75]);
    expect(stats.total).toBe(225);
    expect(stats.average).toBe(75);
    expect(stats.peak).toEqual({ month: "2026-07", amount: 100 });
    expect(stats.lastChange).toBe(0.5);
  });

  it("has no peak and no change when there was no spending", () => {
    const stats = categoryStats(months, [0, 0, 0]);
    expect(stats).toEqual({ total: 0, average: 0, peak: null, lastChange: null });
  });

  it("has no change with a single month", () => {
    expect(categoryStats(["2026-09"], [40]).lastChange).toBeNull();
  });

  it("has no change when the previous month had no spending", () => {
    expect(categoryStats(months, [0, 0, 20]).lastChange).toBeNull();
  });
});
