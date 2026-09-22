"use client";

import { useMemo, useState } from "react";
import { currentMonthKey, shiftMonth } from "./date";
import { MonthRangeSchema, type MonthRange } from "./schema";

/**
 * Intervalo de meses seguidos elegido en una vista (por defecto, los últimos `defaultMonths`
 * meses). `from`/`to` son lo que hay en los selectores (pueden estar vacíos o ser inválidos);
 * `range` solo tiene valor cuando el intervalo es válido, y `error` explica por qué no lo es.
 */
export function useMonthRange(defaultMonths = 6) {
  const [from, setFrom] = useState(() => shiftMonth(currentMonthKey(), -(defaultMonths - 1)));
  const [to, setTo] = useState(() => currentMonthKey());

  const parsed = useMemo(() => MonthRangeSchema.safeParse({ from, to }), [from, to]);
  const range: MonthRange | null = parsed.success ? parsed.data : null;
  const error = parsed.success ? null : (parsed.error.issues[0]?.message ?? "Intervalo inválido.");

  return {
    from,
    to,
    range,
    error,
    setRange: (next: { from: string; to: string }) => {
      setFrom(next.from);
      setTo(next.to);
    },
  };
}
