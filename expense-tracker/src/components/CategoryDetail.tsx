"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Change } from "@/components/Change";
import { categoryColor } from "@/lib/chart-colors";
import { categoryStats, percentChange, type Comparison } from "@/lib/comparison";
import { formatMonthShortLabel, formatMonthTitle } from "@/lib/date";
import { formatCurrency, formatCurrencyRounded } from "@/lib/format";

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

  // Solo se etiquetan el mes más alto y el último; el resto va en el tooltip y la tabla.
  const lastMonth = months[months.length - 1];
  const data = months.map((month, i) => ({
    month,
    amount: values[i],
    label:
      values[i] > 0 && (month === stats.peak?.month || month === lastMonth)
        ? formatCurrencyRounded(values[i], currency)
        : "",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={formatCurrency(stats.total, currency)} />
        <Stat label="Media mensual" value={formatCurrency(stats.average, currency)} />
        <Stat
          label="Mes más alto"
          value={stats.peak ? formatCurrency(stats.peak.amount, currency) : "—"}
          detail={stats.peak ? <span className="capitalize">{formatMonthShortLabel(stats.peak.month)}</span> : null}
        />
        <Stat label="Último mes vs anterior" value={<Change value={stats.lastChange} />} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
          Gasto mensual en {category}
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthShortLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
              tickFormatter={(v) => formatCurrencyRounded(Number(v), currency)}
              domain={[0, "auto"]}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
              labelFormatter={(month) => formatMonthTitle(String(month))}
              formatter={(value) => [formatCurrency(Number(value), currency), category]}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--chart-grid)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
              itemStyle={{ color: "var(--foreground)" }}
            />
            <Bar
              dataKey="amount"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.month} fill={color} />
              ))}
              <LabelList dataKey="label" position="top" fill="var(--chart-text)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {detail && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
    </div>
  );
}
