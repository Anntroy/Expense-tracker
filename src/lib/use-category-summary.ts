"use client";

import { useEffect, useMemo, useState } from "react";
import { buildComparison, type Comparison } from "./comparison";
import { monthRange } from "./date";
import { filterToMemberId, type PersonFilter } from "./member-totals";
import type { MonthRange } from "./schema";
import type { CategoryMonthTotal, TransactionType } from "./types";

type Fetched = {
  /** Consulta a la que pertenecen los datos (para saber si están al día). */
  key: string;
  months: string[];
  rows: CategoryMonthTotal[];
  usedCategories: string[];
};

type Options = {
  /** La pestaña está visible: al activarse se vuelven a pedir los datos (pudieron cambiar en otra). */
  active: boolean;
  /** Intervalo válido; con `null` no se consulta nada. */
  range: MonthRange | null;
  person: PersonFilter;
  /** Tipo de movimiento a resumir (gastos, ahorro...). */
  type: TransactionType;
};

/**
 * Pide al proceso principal el total por mes y categoría de un tipo de movimiento y lo
 * ordena en una matriz categoría × mes. Mientras llegan los datos de una consulta nueva se
 * conserva el resultado anterior (`stale`), para que la vista lo muestre atenuado.
 */
export function useCategorySummary({ active, range, person, type }: Options) {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [apiMissing, setApiMissing] = useState(false);

  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const key = `${type}|${from}|${to}|${person}`;

  useEffect(() => {
    if (!active || from === null || to === null) return;
    if (typeof window === "undefined" || !window.api) {
      Promise.resolve().then(() => setApiMissing(true));
      return;
    }

    let cancelled = false;
    Promise.all([
      window.api.transactions.summary({ from, to }, filterToMemberId(person), type),
      window.api.transactions.categories(type),
    ]).then(([rows, usedCategories]) => {
      if (cancelled) return;
      setFetched({ key, months: monthRange(from, to), rows, usedCategories });
    });

    return () => {
      cancelled = true;
    };
  }, [active, from, to, person, type, key]);

  const comparison: Comparison | null = useMemo(
    () => (fetched ? buildComparison(fetched.rows, fetched.months) : null),
    [fetched],
  );

  return {
    comparison,
    /** Categorías ya usadas alguna vez para este tipo (para sugerirlas en un selector). */
    usedCategories: fetched?.usedCategories ?? [],
    apiMissing,
    stale: fetched !== null && range !== null && fetched.key !== key,
  };
}
