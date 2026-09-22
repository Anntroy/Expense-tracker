import { describe, expect, it } from "vitest";
import { formatCurrency, formatCurrencyRounded, formatPercentChange } from "./format";

// Intl usa un espacio de no separación (U+00A0) entre el número y el símbolo.
const NBSP = " ";

describe("formatCurrency", () => {
  it("formats with two decimals and the symbol after the amount", () => {
    expect(formatCurrency(1234.5, "EUR")).toBe(`1234,50${NBSP}€`);
    expect(formatCurrency(0, "EUR")).toBe(`0,00${NBSP}€`);
  });

  it("does not group thousands in four-digit numbers, but does from five digits (es-ES)", () => {
    expect(formatCurrency(1234, "EUR")).toBe(`1234,00${NBSP}€`);
    expect(formatCurrency(12345, "EUR")).toBe(`12.345,00${NBSP}€`);
  });

  it("uses the narrow symbol for each currency, never a prefixed one like US$", () => {
    expect(formatCurrency(12, "USD")).toBe(`12,00${NBSP}$`);
    expect(formatCurrency(0.5, "GBP")).toBe(`0,50${NBSP}£`);
  });

  it("shows negative amounts with a minus sign", () => {
    expect(formatCurrency(-30, "EUR")).toBe(`-30,00${NBSP}€`);
  });

  it("only changes the symbol, never the amount, when the currency changes", () => {
    expect(formatCurrency(99.99, "EUR").replace(/[^\d,]/g, "")).toBe(formatCurrency(99.99, "USD").replace(/[^\d,]/g, ""));
  });
});

describe("formatCurrencyRounded", () => {
  it("drops the decimals, rounding to the nearest unit", () => {
    expect(formatCurrencyRounded(1200, "EUR")).toBe(`1200${NBSP}€`);
    expect(formatCurrencyRounded(1234.5, "EUR")).toBe(`1235${NBSP}€`);
    expect(formatCurrencyRounded(9999.99, "EUR")).toBe(`10.000${NBSP}€`);
  });
});

describe("formatPercentChange", () => {
  it("always shows the sign of a change", () => {
    expect(formatPercentChange(0.25)).toBe(`+25${NBSP}%`);
    expect(formatPercentChange(-0.5)).toBe(`-50${NBSP}%`);
  });

  it("shows no sign for zero, also when the change rounds to zero", () => {
    expect(formatPercentChange(0)).toBe(`0${NBSP}%`);
    expect(formatPercentChange(0.004)).toBe(`0${NBSP}%`);
  });
});
