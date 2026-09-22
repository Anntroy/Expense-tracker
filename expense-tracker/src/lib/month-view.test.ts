import { describe, expect, it } from "vitest";
import { ALL_PEOPLE, UNASSIGNED } from "./member-totals";
import { viewAfterAdd } from "./month-view";

describe("viewAfterAdd", () => {
  it("stays in the same month when the new transaction falls in it", () => {
    expect(viewAfterAdd({ date: "2026-09-21", memberId: 1 }, { month: "2026-09", person: ALL_PEOPLE })).toEqual({
      month: "2026-09",
      person: ALL_PEOPLE,
    });
  });

  it("switches to the month of the new transaction", () => {
    expect(viewAfterAdd({ date: "2026-08-15", memberId: null }, { month: "2026-09", person: ALL_PEOPLE }).month).toBe(
      "2026-08",
    );
    expect(viewAfterAdd({ date: "2025-12-31", memberId: null }, { month: "2026-01", person: ALL_PEOPLE }).month).toBe(
      "2025-12",
    );
  });

  it("keeps the person filter when the new transaction matches it", () => {
    expect(viewAfterAdd({ date: "2026-09-01", memberId: 2 }, { month: "2026-09", person: "2" }).person).toBe("2");
    expect(viewAfterAdd({ date: "2026-09-01", memberId: null }, { month: "2026-09", person: UNASSIGNED }).person).toBe(
      UNASSIGNED,
    );
  });

  it("clears the person filter when it would hide the new transaction", () => {
    expect(viewAfterAdd({ date: "2026-09-01", memberId: 2 }, { month: "2026-09", person: "1" }).person).toBe(ALL_PEOPLE);
    expect(viewAfterAdd({ date: "2026-09-01", memberId: null }, { month: "2026-09", person: "1" }).person).toBe(ALL_PEOPLE);
    expect(viewAfterAdd({ date: "2026-09-01", memberId: 1 }, { month: "2026-09", person: UNASSIGNED }).person).toBe(
      ALL_PEOPLE,
    );
  });

  it("changes month and clears the filter at the same time when both apply", () => {
    expect(viewAfterAdd({ date: "2026-07-04", memberId: 2 }, { month: "2026-09", person: "1" })).toEqual({
      month: "2026-07",
      person: ALL_PEOPLE,
    });
  });
});
