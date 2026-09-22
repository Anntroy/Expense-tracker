import { describe, expect, it } from "vitest";
import {
  formatMonthTitle,
  monthCount,
  monthDateRange,
  monthOfDate,
  monthRange,
  monthWindow,
  shiftMonth,
  shortcutRange,
  windowEndShowing,
} from "./date";

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

describe("monthRange", () => {
  it("lists every month from `from` to `to`, both included", () => {
    expect(monthRange("2026-08", "2026-09")).toEqual(["2026-08", "2026-09"]);
  });

  it("crosses the year boundary", () => {
    expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("returns a single month when both ends are equal", () => {
    expect(monthRange("2026-09", "2026-09")).toEqual(["2026-09"]);
  });

  it("returns an empty list when the range is inverted", () => {
    expect(monthRange("2026-09", "2026-08")).toEqual([]);
  });
});

describe("monthCount", () => {
  it("counts both ends", () => {
    expect(monthCount("2026-09", "2026-09")).toBe(1);
    expect(monthCount("2026-04", "2026-09")).toBe(6);
    expect(monthCount("2025-10", "2026-09")).toBe(12);
  });
});

describe("formatMonthTitle", () => {
  it("capitalizes only the first letter, not the words after it", () => {
    expect(formatMonthTitle("2026-09")).toBe("Septiembre de 2026");
  });
});

describe("monthOfDate", () => {
  it("keeps the year and month of a full date", () => {
    expect(monthOfDate("2026-08-15")).toBe("2026-08");
    expect(monthOfDate("2025-12-31")).toBe("2025-12");
  });
});

describe("windowEndShowing", () => {
  it("keeps the same window when it already includes the month", () => {
    expect(windowEndShowing("2026-09", "2026-08", 6)).toBe("2026-09");
    expect(windowEndShowing("2026-09", "2026-04", 6)).toBe("2026-09"); // primer mes de la ventana
    expect(windowEndShowing("2026-09", "2026-09", 6)).toBe("2026-09");
  });

  it("moves the window to end at the month when it falls outside", () => {
    expect(windowEndShowing("2026-09", "2026-03", 6)).toBe("2026-03"); // uno antes de la ventana
    expect(windowEndShowing("2026-09", "2025-11", 6)).toBe("2025-11");
    expect(windowEndShowing("2026-09", "2026-10", 6)).toBe("2026-10"); // después de la ventana
  });
});

describe("shortcutRange", () => {
  it("counts back from the anchor month, both ends included", () => {
    expect(shortcutRange("2026-09", 6)).toEqual({ from: "2026-04", to: "2026-09" });
    expect(shortcutRange("2026-09", 2)).toEqual({ from: "2026-08", to: "2026-09" });
    expect(shortcutRange("2026-09", 12)).toEqual({ from: "2025-10", to: "2026-09" });
  });

  it("crosses the year boundary", () => {
    expect(shortcutRange("2026-02", 4)).toEqual({ from: "2025-11", to: "2026-02" });
  });

  it("anchors on today when the end month is empty or half written", () => {
    expect(shortcutRange("", 3, "2026-09")).toEqual({ from: "2026-07", to: "2026-09" });
    expect(shortcutRange("2026-", 3, "2026-09")).toEqual({ from: "2026-07", to: "2026-09" });
  });

  it("always produces a range of the requested size", () => {
    for (const n of [2, 3, 6, 12]) {
      const { from, to } = shortcutRange("2026-09", n);
      expect(monthCount(from, to)).toBe(n);
    }
  });
});
