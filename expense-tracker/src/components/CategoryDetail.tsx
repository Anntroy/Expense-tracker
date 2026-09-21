"use client";

import { Change } from "@/components/Change";
import { MonthlyBarChart } from "@/components/MonthlyBarChart";
import { StatTile } from "@/components/StatTile";
import { categoryColor } from "@/lib/chart-colors";
import { categoryStats, percentChange, type Comparison } from "@/lib/comparison";
import { formatMonthShortLabel, formatMonthTitle } from "@/lib/date";
import { formatCurrency } from "@/lib/format";

type Props = {
  comparison: Comparison;
  category: string;
  currency: string;
};

/** Gasto de una sola categoría mes a mes: cifras resumen, gráfico y tabla. */
export function CategoryDetail({ comparison, category, currency }: Props) {
  const { months } = comparison;
  const values = comparison.rows.find((r) => r.category === category)?.values ?? months.map(() => 0);
  const stats = categoryStats(months, values);
  const color = categoryColor(category);

  if (stats.total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No hay gastos en «{category}» en este intervalo de meses.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total" value={formatCurrency(stats.total, currency)} />
        <StatTile label="Media mensual" value={formatCurrency(stats.average, currency)} />
        <StatTile
          label="Mes más alto"
          value={stats.peak ? formatCurrency(stats.peak.amount, currency) : "—"}
          detail={stats.peak ? <span className="capitalize">{formatMonthShortLabel(stats.peak.month)}</span> : null}
        />
        <StatTile label="Último mes vs anterior" value={<Change value={stats.lastChange} />} />
      </div>

      <MonthlyBarChart
        months={months}
        values={values}
        color={color}
        seriesName={category}
        title={<>Gasto mensual en {category}</>}
        currency={currency}
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-2 text-left font-medium">Mes</th>
              <th className="px-4 py-2 text-right font-medium">Gasto</th>
              <th className="px-4 py-2 text-right font-medium">Vs mes anterior</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {months.map((month, i) => (
              <tr key={month}>
                <th scope="row" className="px-4 py-2 text-left font-normal text-zinc-700 dark:text-zinc-300">
                  {formatMonthTitle(month)}
                </th>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                  {values[i] === 0 ? <span className="text-zinc-300 dark:text-zinc-600">—</span> : formatCurrency(values[i], currency)}
                </td>
                <td className="px-4 py-2 text-right">
                  <Change value={i === 0 ? null : percentChange(values[i - 1], values[i])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
