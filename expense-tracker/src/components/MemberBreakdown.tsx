import { PersonSelect } from "@/components/PersonSelect";
import { totalsByMember, type PersonFilter } from "@/lib/member-totals";
import { formatCurrency } from "@/lib/format";
import type { Member, Transaction } from "@/lib/types";

type Props = {
  /** Movimientos del mes SIN filtrar: la tabla siempre compara a todas las personas. */
  transactions: Transaction[];
  members: Member[];
  currency: string;
  filter: PersonFilter;
  onFilterChange: (filter: PersonFilter) => void;
};

const th = "px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400";
const td = "px-3 py-2 text-right text-sm tabular-nums";

/** Ingresos, gastos y balance de cada persona en el mes, más el filtro que acota el resto de la vista. */
export function MemberBreakdown({ transactions, members, currency, filter, onFilterChange }: Props) {
  const rows = totalsByMember(transactions, members);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Por persona</h2>
        <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          Ver
          <PersonSelect value={filter} onChange={onFilterChange} members={members} />
        </label>
      </div>
      <div className="overflow-x-auto p-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Persona</th>
              <th className={th}>Ingresos</th>
              <th className={th}>Gastos</th>
              <th className={th}>Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.key} className={row.key === filter ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                <th
                  scope="row"
                  className={`px-3 py-2 text-left text-sm font-medium ${
                    row.archived ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {row.name}
                  {row.archived && <span className="ml-1 text-xs font-normal">(archivado)</span>}
                </th>
                <td className={`${td} text-emerald-600 dark:text-emerald-400`}>{formatCurrency(row.income, currency)}</td>
                <td className={`${td} text-red-600 dark:text-red-400`}>{formatCurrency(row.expenses, currency)}</td>
                <td
                  className={`${td} font-semibold ${
                    row.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(row.balance, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
