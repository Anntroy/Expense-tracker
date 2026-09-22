import { Change } from "@/components/Change";
import { categoryColor } from "@/lib/chart-colors";
import { percentChange, type Comparison } from "@/lib/comparison";
import { formatMonthShortLabel } from "@/lib/date";
import { formatCurrency } from "@/lib/format";

type Props = {
  comparison: Comparison;
  currency: string;
};

function lastChange(values: number[]): number | null {
  const last = values.length - 1;
  return last >= 1 ? percentChange(values[last - 1], values[last]) : null;
}

const th = "whitespace-nowrap px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400";
const td = "whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300";

/** Categorías en filas y meses en columnas: la misma información que los paneles, en cifras. */
export function ComparisonTable({ comparison, currency }: Props) {
  const { months, rows, monthTotals } = comparison;
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Categoría
            </th>
            {months.map((m) => (
              <th key={m} className={`${th} capitalize`}>
                {formatMonthShortLabel(m)}
              </th>
            ))}
            <th className={th}>Total</th>
            <th className={th}>Último mes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.category}>
              <th
                scope="row"
                className="sticky left-0 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: categoryColor(row.category) }}
                    aria-hidden
                  />
                  {row.category}
                </span>
              </th>
              {row.values.map((value, i) => (
                <td key={months[i]} className={td}>
                  {value === 0 ? <span className="text-zinc-300 dark:text-zinc-600">—</span> : formatCurrency(value, currency)}
                </td>
              ))}
              <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-50`}>
                {formatCurrency(row.total, currency)}
              </td>
              <td className={td}>
                <Change value={lastChange(row.values)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200 dark:border-zinc-800">
            <th scope="row" className="sticky left-0 bg-white px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
              Total
            </th>
            {monthTotals.map((value, i) => (
              <td key={months[i]} className={`${td} font-semibold`}>
                {formatCurrency(value, currency)}
              </td>
            ))}
            <td className={`${td} font-semibold text-zinc-900 dark:text-zinc-50`}>
              {formatCurrency(grandTotal, currency)}
            </td>
            <td className={td}>
              <Change value={lastChange(monthTotals)} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
