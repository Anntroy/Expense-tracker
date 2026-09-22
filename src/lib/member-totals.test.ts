import { describe, expect, it } from "vitest";
import {
  ALL_PEOPLE,
  UNASSIGNED,
  filterToMemberId,
  matchesPerson,
  personLabel,
  personOptions,
  resolveMemberChoice,
} from "./member-totals";
import type { Member } from "./types";

const ana: Member = { id: 1, name: "Ana", archived: false };
const luis: Member = { id: 2, name: "Luis", archived: false };
const marta: Member = { id: 3, name: "Marta", archived: true };

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

describe("resolveMemberChoice", () => {
  const members = [ana, luis];

  it("proposes the first member when nothing was chosen yet", () => {
    expect(resolveMemberChoice(null, members)).toBe("1");
  });

  it("respects the member chosen by hand", () => {
    expect(resolveMemberChoice("2", members)).toBe("2");
  });

  it("respects an explicit 'Sin asignar' instead of snapping back to the first member", () => {
    expect(resolveMemberChoice("", members)).toBe("");
  });

  it("falls back to the first member if the chosen one is no longer available", () => {
    expect(resolveMemberChoice("99", members)).toBe("1");
    expect(resolveMemberChoice("2", [ana])).toBe("1");
  });

  it("is empty when there are no members at all", () => {
    expect(resolveMemberChoice(null, [])).toBe("");
    expect(resolveMemberChoice("1", [])).toBe("");
  });
});
