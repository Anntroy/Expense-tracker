import { describe, expect, it } from "vitest";
import {
  ALL_PEOPLE,
  UNASSIGNED,
  filterToMemberId,
  matchesPerson,
  personLabel,
  personOptions,
  totalsByMember,
} from "./member-totals";
import type { Member, Transaction } from "./types";

const ana: Member = { id: 1, name: "Ana", archived: false };
const luis: Member = { id: 2, name: "Luis", archived: false };
const marta: Member = { id: 3, name: "Marta", archived: true };

let nextId = 1;
function tx(
  type: Transaction["type"],
  amount: number,
  memberId: number | null,
  excluded = false,
): Transaction {
  return { id: nextId++, type, category: "X", amount, description: "", date: "2026-09-10", excluded, memberId };
}

describe("matchesPerson", () => {
  it("everything matches when there is no filter", () => {
    expect(matchesPerson({ memberId: 1 }, ALL_PEOPLE)).toBe(true);
    expect(matchesPerson({ memberId: null }, ALL_PEOPLE)).toBe(true);
  });

  it("matches only the chosen member", () => {
    expect(matchesPerson({ memberId: 1 }, "1")).toBe(true);
    expect(matchesPerson({ memberId: 2 }, "1")).toBe(false);
    expect(matchesPerson({ memberId: null }, "1")).toBe(false);
  });

  it("the unassigned filter matches only transactions without a member", () => {
    expect(matchesPerson({ memberId: null }, UNASSIGNED)).toBe(true);
    expect(matchesPerson({ memberId: 1 }, UNASSIGNED)).toBe(false);
  });
});

describe("filterToMemberId", () => {
  it("translates the UI filter into the query parameter", () => {
    expect(filterToMemberId(ALL_PEOPLE)).toBeUndefined();
    expect(filterToMemberId(UNASSIGNED)).toBeNull();
    expect(filterToMemberId("3")).toBe(3);
  });
});

describe("totalsByMember", () => {
  it("adds income, expenses and balance per member", () => {
    const rows = totalsByMember(
      [tx("income", 1800, 1), tx("expense", 300, 1), tx("expense", 50.5, 2), tx("expense", 10, 2)],
      [ana, luis],
    );
    expect(rows).toEqual([
      { key: "1", name: "Ana", archived: false, income: 1800, expenses: 300, balance: 1500 },
      { key: "2", name: "Luis", archived: false, income: 0, expenses: 60.5, balance: -60.5 },
    ]);
  });

  it("ignores deactivated transactions", () => {
    const rows = totalsByMember([tx("expense", 100, 1, true), tx("expense", 5, 1)], [ana]);
    expect(rows[0].expenses).toBe(5);
  });

  it("lists active members even with no movements", () => {
    const rows = totalsByMember([], [ana, luis]);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Luis"]);
    expect(rows.every((r) => r.income === 0 && r.expenses === 0 && r.balance === 0)).toBe(true);
  });

  it("shows archived members only if they have movements", () => {
    expect(totalsByMember([], [ana, marta]).map((r) => r.name)).toEqual(["Ana"]);
    const rows = totalsByMember([tx("expense", 30, 3)], [ana, marta]);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Marta"]);
    expect(rows[1].archived).toBe(true);
  });

  it("adds an unassigned row at the end only if there are unassigned movements", () => {
    expect(totalsByMember([tx("expense", 5, 1)], [ana]).map((r) => r.name)).toEqual(["Ana"]);
    const rows = totalsByMember([tx("expense", 12, null), tx("expense", 5, 1)], [ana]);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Sin asignar"]);
    expect(rows[1]).toMatchObject({ key: UNASSIGNED, expenses: 12 });
  });

  it("does not leak floating-point noise", () => {
    const rows = totalsByMember([tx("expense", 0.1, 1), tx("expense", 0.2, 1)], [ana]);
    expect(rows[0].expenses).toBe(0.3);
  });
});

describe("personOptions", () => {
  it("lists everyone first, then each member, and unassigned last", () => {
    expect(personOptions([ana, luis])).toEqual([
      { value: "", label: "Todas las personas" },
      { value: "1", label: "Ana" },
      { value: "2", label: "Luis" },
      { value: "none", label: "Sin asignar" },
    ]);
  });

  it("marks archived members", () => {
    expect(personOptions([marta]).find((o) => o.value === "3")?.label).toBe("Marta (archivado)");
  });
});

describe("personLabel", () => {
  it("returns the label of the filter, or an empty text for an unknown one", () => {
    expect(personLabel("2", [ana, luis])).toBe("Luis");
    expect(personLabel(UNASSIGNED, [ana])).toBe("Sin asignar");
    expect(personLabel("99", [ana])).toBe("");
  });
});
