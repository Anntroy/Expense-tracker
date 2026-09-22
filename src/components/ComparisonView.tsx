"use client";

import { useMemo, useState } from "react";
import { ApiMissingNotice } from "@/components/ApiMissingNotice";
import { CategoryDetail } from "@/components/CategoryDetail";
import { CategoryPanels } from "@/components/CategoryPanels";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PersonSelect } from "@/components/PersonSelect";
import { RangePicker } from "@/components/RangePicker";
import { mergeCategories } from "@/lib/categories";
import { ALL_PEOPLE, personLabel, type PersonFilter } from "@/lib/member-totals";
import { useCategorySummary } from "@/lib/use-category-summary";
import { useMonthRange } from "@/lib/use-month-range";
import { EXPENSE_CATEGORIES, type Member } from "@/lib/types";

type Props = {
  currency: string;
  /** La pestaña está visible: al activarse se vuelven a pedir los datos (pudieron cambiar en la otra). */
  active: boolean;
  /** Miembros del hogar (activos y archivados), para el filtro por persona. */
  members: Member[];
};

export function ComparisonView({ currency, active, members }: Props) {
  const { from, to, range, error, setRange } = useMonthRange();
  const [category, setCategory] = useState(""); // "" = todas
  const [person, setPerson] = useState<PersonFilter>(ALL_PEOPLE);
  const { comparison, usedCategories, apiMissing, stale } = useCategorySummary({
    active,
    range,
    person,
    type: "expense",
  });

  // Las mismas categorías que sugiere el formulario, más las que aparecen en el intervalo.
  const categoryOptions = useMemo(() => {
    return mergeCategories(EXPENSE_CATEGORIES, usedCategories, comparison?.rows.map((r) => r.category) ?? []);
  }, [comparison, usedCategories]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <RangePicker from={from} to={to} error={error} onChange={setRange} />
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
