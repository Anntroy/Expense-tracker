"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { expenseTotalsByCategory } from "@/lib/category-totals";
import { categoryColor } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Props = {
  transactions: Transaction[];
  currency: string;
};

export function CategoryChart({ transactions, currency }: Props) {
  const data = useMemo(() => expenseTotalsByCategory(transactions), [transactions]);

  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Todavía no hay gastos este mes para mostrar por categoría.
      </p>
    );
  }

  const height = data.length * 44 + 40;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Gastos por categoría
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" hide />
          <YAxis
            dataKey="category"
            type="category"
            width={90}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-text)", fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
            formatter={(value) => formatCurrency(Number(value), currency)}
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--chart-grid)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.category} fill={categoryColor(entry.category)} />
            ))}
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(value) => formatCurrency(Number(value), currency)}
              fill="var(--chart-text)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
