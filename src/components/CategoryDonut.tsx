"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { expenseTotalsByCategory } from "@/lib/category-totals";
import { categoryColor } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Props = {
  transactions: Transaction[];
  currency: string;
};

const percentFormat = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function CategoryDonut({ transactions, currency }: Props) {
  const data = useMemo(() => expenseTotalsByCategory(transactions), [transactions]);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.amount, 0), [data]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Porcentaje de gastos por categoría
      </h2>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-56 w-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value) => [
                  `${formatCurrency(Number(value), currency)} · ${percentFormat.format(Number(value) / total)}`,
                ]}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--chart-grid)",
                  borderRadius: 8,
                  color: "var(--foreground)",
                }}
                itemStyle={{ color: "var(--foreground)" }}
              />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius="62%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={categoryColor(entry.category)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Total</span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>

        <ul className="w-full flex-1 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {data.map((entry) => (
            <li key={entry.category} className="flex items-center gap-3 py-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: categoryColor(entry.category) }}
                aria-hidden
              />
              <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
                {entry.category}
              </span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {formatCurrency(entry.amount, currency)}
              </span>
              <span className="w-14 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                {percentFormat.format(entry.amount / total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
