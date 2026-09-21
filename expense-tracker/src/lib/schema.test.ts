import { describe, expect, it } from "vitest";
import { MonthRangeSchema, SetExcludedSchema, TransactionInputSchema } from "./schema";

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
