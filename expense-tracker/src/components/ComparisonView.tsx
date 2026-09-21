"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiMissingNotice } from "@/components/ApiMissingNotice";
import { CategoryDetail } from "@/components/CategoryDetail";
import { CategoryPanels } from "@/components/CategoryPanels";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PersonSelect } from "@/components/PersonSelect";
import { RangePicker } from "@/components/RangePicker";
import { buildComparison } from "@/lib/comparison";
import { currentMonthKey, monthRange, shiftMonth } from "@/lib/date";
import { ALL_PEOPLE, filterToMemberId, personLabel, type PersonFilter } from "@/lib/member-totals";
import { MonthRangeSchema } from "@/lib/schema";
import { EXPENSE_CATEGORIES, type CategoryMonthTotal, type Member } from "@/lib/types";

const DEFAULT_MONTHS = 6;

type Fetched = {
  /** Intervalo al que pertenecen los datos (para saber si están al día). */
  key: string;
  months: string[];
  rows: CategoryMonthTotal[];
  usedCategories: string[];
};

type Props = {
  currency: string;
  /** La pestaña está visible: al activarse se vuelven a pedir los datos (pudieron cambiar en la otra). */
  active: boolean;
  /** Miembros del hogar (activos y archivados), para el filtro por persona. */
  members: Member[];
};

export function ComparisonView({ currency, active, members }: Props) {
  const [from, setFrom] = useState(() => shiftMonth(currentMonthKey(), -(DEFAULT_MONTHS - 1)));
  const [to, setTo] = useState(() => currentMonthKey());
  const [category, setCategory] = useState(""); // "" = todas
  const [person, setPerson] = useState<PersonFilter>(ALL_PEOPLE);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [apiMissing, setApiMissing] = useState(false);

  const parsed = useMemo(() => MonthRangeSchema.safeParse({ from, to }), [from, to]);
  const rangeFrom = parsed.success ? parsed.data.from : null;
  const rangeTo = parsed.success ? parsed.data.to : null;
  const error = parsed.success ? null : (parsed.error.issues[0]?.message ?? "Intervalo inválido.");

  useEffect(() => {
    if (!active || rangeFrom === null || rangeTo === null) return;
    if (typeof window === "undefined" || !window.api) {
      Promise.resolve().then(() => setApiMissing(true));
      return;
    }

    let cancelled = false;
    Promise.all([
      window.api.transactions.summary({ from: rangeFrom, to: rangeTo }, filterToMemberId(person)),
      window.api.transactions.categories("expense"),
    ]).then(([rows, usedCategories]) => {
      if (cancelled) return;
      setFetched({
        key: `${rangeFrom}|${rangeTo}|${person}`,
        months: monthRange(rangeFrom, rangeTo),
        rows,
        usedCategories,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, rangeFrom, rangeTo, person]);

  const comparison = useMemo(
    () => (fetched ? buildComparison(fetched.rows, fetched.months) : null),
    [fetched],
  );

  // Las mismas categorías que sugiere el formulario, más las que aparecen en el intervalo.
  const categoryOptions = useMemo(() => {
    const all = new Set<string>([...EXPENSE_CATEGORIES, ...(fetched?.usedCategories ?? [])]);
    fetched?.rows.forEach((r) => all.add(r.category));
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [fetched]);

  // Mientras llegan los datos del nuevo intervalo se mantiene el render anterior, atenuado.
  const stale = fetched !== null && parsed.success && fetched.key !== `${rangeFrom}|${rangeTo}|${person}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <RangePicker
          from={from}
          to={to}
          error={error}
          onChange={(range) => {
            setFrom(range.from);
            setTo(range.to);
          }}
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400 sm:w-64">
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">Todas las categorías</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {members.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400 sm:w-64">
              Persona
              <PersonSelect value={person} onChange={setPerson} members={members} />
            </label>
          )}
        </div>
      </div>

      {person !== ALL_PEOPLE && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Mostrando solo los gastos de <strong>{personLabel(person, members)}</strong>.
        </p>
      )}

      {apiMissing ? (
        <ApiMissingNotice />
      ) : comparison === null ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {error ? "Corregí el intervalo para ver la comparación." : "Cargando…"}
        </p>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity ${stale || error ? "opacity-60" : ""}`}>
          {category !== "" ? (
            <CategoryDetail comparison={comparison} category={category} currency={currency} />
          ) : comparison.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No hay gastos en este intervalo de meses.
            </p>
          ) : (
            <>
              <CategoryPanels comparison={comparison} currency={currency} />
              <ComparisonTable comparison={comparison} currency={currency} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
