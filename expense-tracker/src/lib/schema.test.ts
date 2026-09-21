import { describe, expect, it } from "vitest";
import {
  CurrencySchema,
  MemberIdSchema,
  MemberNameSchema,
  MonthRangeSchema,
  PinSchema,
  SetExcludedSchema,
  TransactionInputSchema,
} from "./schema";

const valid = {
  type: "expense",
  amount: 12.5,
  category: "Comida",
  description: "Menú",
  date: "2026-09-10",
};

describe("TransactionInputSchema", () => {
  it("accepts a valid transaction", () => {
    expect(TransactionInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects zero, negative or non-numeric amounts", () => {
    expect(TransactionInputSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...valid, amount: -5 }).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...valid, amount: "12" }).success).toBe(false);
  });

  it("trims the category and rejects an empty or whitespace-only one", () => {
    const trimmed = TransactionInputSchema.parse({ ...valid, category: "  Mascotas  " });
    expect(trimmed.category).toBe("Mascotas");
    expect(TransactionInputSchema.safeParse({ ...valid, category: "   " }).success).toBe(false);
  });

  it("accepts free-text categories outside the fixed ones", () => {
    expect(TransactionInputSchema.safeParse({ ...valid, category: "Regalos" }).success).toBe(true);
  });

  it("rejects an invalid type and an empty date", () => {
    expect(TransactionInputSchema.safeParse({ ...valid, type: "transfer" }).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...valid, date: "" }).success).toBe(false);
  });

  it("description is optional and defaults to empty", () => {
    const { description: _omit, ...withoutDescription } = valid;
    expect(TransactionInputSchema.parse(withoutDescription).description).toBe("");
  });

  it("limits the description to 200 characters", () => {
    expect(
      TransactionInputSchema.safeParse({ ...valid, description: "x".repeat(201) }).success,
    ).toBe(false);
  });
});

describe("SetExcludedSchema", () => {
  it("accepts a positive integer id and a boolean", () => {
    expect(SetExcludedSchema.safeParse({ id: 3, excluded: true }).success).toBe(true);
  });

  it("rejects invalid ids and non-boolean flags", () => {
    expect(SetExcludedSchema.safeParse({ id: 0, excluded: true }).success).toBe(false);
    expect(SetExcludedSchema.safeParse({ id: 1.5, excluded: true }).success).toBe(false);
    expect(SetExcludedSchema.safeParse({ id: 1, excluded: "yes" }).success).toBe(false);
  });
});

describe("MonthRangeSchema", () => {
  it("accepts a valid range, including a single month", () => {
    expect(MonthRangeSchema.safeParse({ from: "2026-08", to: "2026-09" }).success).toBe(true);
    expect(MonthRangeSchema.safeParse({ from: "2026-09", to: "2026-09" }).success).toBe(true);
  });

  it("accepts exactly 12 months but rejects 13", () => {
    expect(MonthRangeSchema.safeParse({ from: "2025-10", to: "2026-09" }).success).toBe(true);
    expect(MonthRangeSchema.safeParse({ from: "2025-09", to: "2026-09" }).success).toBe(false);
  });

  it("rejects an inverted range", () => {
    expect(MonthRangeSchema.safeParse({ from: "2026-09", to: "2026-08" }).success).toBe(false);
  });

  it("rejects malformed months", () => {
    expect(MonthRangeSchema.safeParse({ from: "2026-13", to: "2026-09" }).success).toBe(false);
    expect(MonthRangeSchema.safeParse({ from: "2026-9", to: "2026-09" }).success).toBe(false);
    expect(MonthRangeSchema.safeParse({ from: "", to: "2026-09" }).success).toBe(false);
  });
});

describe("TransactionInputSchema memberId", () => {
  const base = { type: "expense", amount: 5, category: "Comida", date: "2026-09-10" };

  it("defaults to null (unassigned) when omitted", () => {
    expect(TransactionInputSchema.parse(base).memberId).toBeNull();
  });

  it("accepts a positive integer id or null, and rejects anything else", () => {
    expect(TransactionInputSchema.safeParse({ ...base, memberId: 3 }).success).toBe(true);
    expect(TransactionInputSchema.safeParse({ ...base, memberId: null }).success).toBe(true);
    expect(TransactionInputSchema.safeParse({ ...base, memberId: 0 }).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...base, memberId: "1" }).success).toBe(false);
  });
});

describe("member schemas", () => {
  it("MemberNameSchema trims and enforces 1 to 30 characters", () => {
    expect(MemberNameSchema.parse("  Ana ")).toBe("Ana");
    expect(MemberNameSchema.safeParse("   ").success).toBe(false);
    expect(MemberNameSchema.safeParse("x".repeat(30)).success).toBe(true);
    expect(MemberNameSchema.safeParse("x".repeat(31)).success).toBe(false);
  });

  it("MemberIdSchema only accepts positive integers", () => {
    expect(MemberIdSchema.safeParse(2).success).toBe(true);
    expect(MemberIdSchema.safeParse(0).success).toBe(false);
    expect(MemberIdSchema.safeParse(1.5).success).toBe(false);
  });
});

describe("PinSchema", () => {
  it("accepts 4 to 8 digits", () => {
    for (const ok of ["1234", "000000", "12345678"]) expect(PinSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["123", "123456789", "12a4", "", " 1234", "12.34", 1234]) {
      expect(PinSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("CurrencySchema", () => {
  it("only accepts the supported currencies", () => {
    expect(CurrencySchema.safeParse("EUR").success).toBe(true);
    expect(CurrencySchema.safeParse("USD").success).toBe(true);
    expect(CurrencySchema.safeParse("JPY").success).toBe(false);
  });
});

describe("transaction types", () => {
  const base = { amount: 100, category: "Vacaciones", date: "2026-09-10" };

  it("accepts income, expense and saving", () => {
    for (const type of ["income", "expense", "saving"]) {
      expect(TransactionInputSchema.safeParse({ ...base, type }).success).toBe(true);
    }
  });

  it("rejects any other type", () => {
    expect(TransactionInputSchema.safeParse({ ...base, type: "transfer" }).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...base, type: "savings" }).success).toBe(false);
  });
});
