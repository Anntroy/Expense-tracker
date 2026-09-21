"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonthShortLabel, formatMonthTitle } from "@/lib/date";
import { formatCurrency, formatCurrencyRounded } from "@/lib/format";

type Props = {
  months: string[];
  /** Un valor por mes, alineado con `months`. */
  values: number[];
  color: string;
  /** Nombre de la serie en el tooltip. */
  seriesName: string;
  /** Encabezado de la tarjeta. */
  title: ReactNode;
  currency: string;
};

/**
 * Columnas por mes de una sola serie. Solo se etiquetan el mes más alto y el último; el resto
 * de valores están en el tooltip y en la tabla que acompaña al gráfico.
 */
export function MonthlyBarChart({ months, values, color, seriesName, title, currency }: Props) {
  const peakValue = Math.max(0, ...values);
  const peakIndex = peakValue > 0 ? values.indexOf(peakValue) : -1;
  const lastIndex = months.length - 1;

  const data = months.map((month, i) => ({
    month,
    amount: values[i],
    label: values[i] > 0 && (i === peakIndex || i === lastIndex) ? formatCurrencyRounded(values[i], currency) : "",
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
        {title}
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
            formatter={(value) => [formatCurrency(Number(value), currency), seriesName]}
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
            <LabelList dataKey="label" position="top" fill="var(--chart-text)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
