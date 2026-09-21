import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type Props = {
  transactions: Transaction[];
  currency: string;
  onDelete: (id: number) => void;
  onToggleExcluded: (id: number, excluded: boolean) => void;
};

export function TransactionList({ transactions, currency, onDelete, onToggleExcluded }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Todavía no registraste ningún movimiento este mes.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {transactions.map((t) => (
        <li
          key={t.id}
          className={`flex items-center justify-between gap-4 px-5 py-3 ${t.excluded ? "opacity-50" : ""}`}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t.category}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.date}
              {t.description && ` · ${t.description}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-semibold ${t.excluded ? "line-through " : ""}${
                t.type === "income"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {t.type === "income" ? "+" : "-"}
              {formatCurrency(t.amount, currency)}
            </span>
            <button
              type="button"
              onClick={() => onToggleExcluded(t.id, !t.excluded)}
              aria-label={t.excluded ? "Activar movimiento" : "Desactivar movimiento"}
              aria-pressed={t.excluded}
              title={t.excluded ? "Desactivado: no cuenta en el recuento. Click para activar" : "Desactivar: no contar en el recuento"}
              className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                {t.excluded ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M1 1l22 22" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete(t.id)}
              aria-label="Borrar movimiento"
              title="Borrar"
              className="text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
