import { describe, expect, it } from "vitest";
import { monthDateRange, monthWindow, shiftMonth } from "./date";

describe("shiftMonth", () => {
  it("moves forward and backward within the year", () => {
    expect(shiftMonth("2026-05", 1)).toBe("2026-06");
    expect(shiftMonth("2026-05", -1)).toBe("2026-04");
  });

  it("crosses the year boundary in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-01", -13)).toBe("2024-12");
  });

  it("returns the same month with delta 0", () => {
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });
});

describe("monthWindow", () => {
  it("returns `count` months ending at `end`, oldest to newest", () => {
    expect(monthWindow("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("monthDateRange", () => {
  it("covers from day 1 to the last day of the month", () => {
    expect(monthDateRange("2026-09")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(monthDateRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("February respects leap years", () => {
    expect(monthDateRange("2026-02").to).toBe("2026-02-28");
    expect(monthDateRange("2028-02").to).toBe("2028-02-29");
  });
});
