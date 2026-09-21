"use client";

import { useState } from "react";
import { ApiMissingNotice } from "@/components/ApiMissingNotice";
import { Change } from "@/components/Change";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { PersonSelect } from "@/components/PersonSelect";
import { RangePicker } from "@/components/RangePicker";
import { StatTile } from "@/components/StatTile";
import { categoryStats, percentChange } from "@/lib/comparison";
import { formatMonthShortLabel, formatMonthTitle } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import { ALL_PEOPLE, personLabel, type PersonFilter } from "@/lib/member-totals";
import { roundCents } from "@/lib/money";
import { useCategorySummary } from "@/lib/use-category-summary";
import { useMonthRange } from "@/lib/use-month-range";
import type { Member } from "@/lib/types";

type Props = {
  currency: string;
  /** La pestaña está visible: al activarse se vuelven a pedir los datos (pudieron cambiar en otra). */
  active: boolean;
  /** Miembros del hogar (activos y archivados), para el filtro por persona. */
  members: Member[];
};

/** Color del ahorro: el mismo azul que en las tarjetas y en la lista de movimientos. */
const SAVING_COLOR = "var(--saving)";

/** Ahorro del periodo elegido: cifras resumen, evolución mensual, desglose por categoría y tabla con el acumulado. */
export function SavingsView({ currency, active, members }: Props) {
  const { from, to, range, error, setRange } = useMonthRange();
  const [person, setPerson] = useState<PersonFilter>(ALL_PEOPLE);
  const { comparison, apiMissing, stale } = useCategorySummary({ active, range, person, type: "saving" });

  const stats = comparison ? categoryStats(comparison.months, comparison.monthTotals) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <RangePicker from={from} to={to} error={error} onChange={setRange} />
        {members.length > 0 && (
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400 sm:w-64">
            Persona
            <PersonSelect value={person} onChange={setPerson} members={members} />
          </label>
        )}
      </div>

      {person !== ALL_PEOPLE && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Mostrando solo el ahorro de <strong>{personLabel(person, members)}</strong>.
        </p>
      )}

      {apiMissing ? (
        <ApiMissingNotice />
      ) : comparison === null || stats === null ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {error ? "Corregí el intervalo para ver el ahorro." : "Cargando…"}
        </p>
      ) : stats.total === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay ahorro en este intervalo de meses. Registra un movimiento de tipo «Ahorro» en la pestaña de
          ingresos y gastos.
        </p>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity ${stale || error ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Total ahorrado" value={formatCurrency(stats.total, currency)} />
            <StatTile label="Media mensual" value={formatCurrency(stats.average, currency)} />
            <StatTile
              label="Mes con más ahorro"
              value={stats.peak ? formatCurrency(stats.peak.amount, currency) : "—"}
              detail={stats.peak ? <span className="capitalize">{formatMonthShortLabel(stats.peak.month)}</span> : null}
            />
            <StatTile label="Último mes vs anterior" value={<Change value={stats.lastChange} upIsGood />} />
          </div>

          <MonthlyBarChart
            months={comparison.months}
            values={comparison.monthTotals}
            color={SAVING_COLOR}
            seriesName="Ahorro"
            title="Ahorro mensual"
            currency={currency}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CategoryBreakdown rows={comparison.rows} total={stats.total} currency={currency} />
            <MonthTable months={comparison.months} values={comparison.monthTotals} currency={currency} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Reparto del ahorro del periodo por categoría: importe, porcentaje y una barra proporcional. */
function CategoryBreakdown({
  rows,
  total,
  currency,
}: {
  rows: { category: string; total: number }[];
  total: number;
  currency: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Por categoría</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const share = total > 0 ? row.total / total : 0;
          return (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{row.category}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-zinc-500 dark:text-zinc-400">{formatCurrency(row.total, currency)}</span>
                  <span className="ml-3 inline-block w-12 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    {new Intl.NumberFormat("es-ES", { style: "percent", maximumFractionDigits: 1 }).format(share)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: SAVING_COLOR }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Mes a mes: lo ahorrado, la variación y el acumulado del periodo. */
function MonthTable({ months, values, currency }: { months: string[]; values: number[]; currency: string }) {
  const cumulative = values.reduce<number[]>(
    (acc, value) => [...acc, roundCents((acc[acc.length - 1] ?? 0) + value)],
    [],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-2 text-left font-medium">Mes</th>
            <th className="px-4 py-2 text-right font-medium">Ahorro</th>
            <th className="px-4 py-2 text-right font-medium">Acumulado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {months.map((month, i) => (
            <tr key={month}>
              <th scope="row" className="px-4 py-2 text-left font-normal text-zinc-700 dark:text-zinc-300">
                {formatMonthTitle(month)}
              </th>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {values[i] === 0 ? (
                  <span className="text-zinc-300 dark:text-zinc-600">—</span>
                ) : (
                  <>
                    {formatCurrency(values[i], currency)}
                    {i > 0 && percentChange(values[i - 1], values[i]) !== null && (
                      <span className="ml-2 text-xs">
                        <Change value={percentChange(values[i - 1], values[i])} upIsGood />
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className="px-4 py-2 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                {formatCurrency(cumulative[i], currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
