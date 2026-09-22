"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryColor } from "@/lib/chart-colors";
import type { Comparison, ComparisonRow } from "@/lib/comparison";
import { formatMonthShortLabel, formatMonthTitle } from "@/lib/date";
import { formatCurrency } from "@/lib/format";

type Props = {
  comparison: Comparison;
  currency: string;
};

/**
 * Un panel pequeño por categoría, todos con la misma escala vertical
 * (`sharedMax`) para poder comparar unas categorías con otras a simple vista.
 */
export function CategoryPanels({ comparison, currency }: Props) {
  const { months, rows } = comparison;
  const sharedMax = Math.max(0, ...rows.flatMap((r) => r.values));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <Panel key={row.category} row={row} months={months} sharedMax={sharedMax} currency={currency} />
      ))}
    </div>
  );
}

function Panel({
  row,
  months,
  sharedMax,
  currency,
}: {
  row: ComparisonRow;
  months: string[];
  sharedMax: number;
  currency: string;
}) {
  const color = categoryColor(row.category);
  const data = months.map((month, i) => ({ month, amount: row.values[i] }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
          <span className="truncate">{row.category}</span>
        </h3>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatCurrency(row.total, currency)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthShortLabel}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tick={{ fill: "var(--chart-text)", fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis hide domain={[0, sharedMax]} />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
            labelFormatter={(month) => formatMonthTitle(String(month))}
            formatter={(value) => [formatCurrency(Number(value), currency), row.category]}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            itemStyle={{ color: "var(--foreground)" }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
