"use client";

import { useId } from "react";
import { formatMonthShortLabel, monthCount, shortcutRange } from "@/lib/date";
import { MAX_COMPARISON_MONTHS } from "@/lib/schema";

const SHORTCUTS = [2, 3, 6, 12] as const;

type Props = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** Mensaje de validación (intervalo inválido), si lo hay. */
  error: string | null;
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:[color-scheme:dark]";

/**
 * Elige el intervalo de meses seguidos: dos selectores de mes (Desde/Hasta) y
 * atajos por cantidad (2/3/6/12) que cuentan hacia atrás desde "Hasta".
 */
export function RangePicker({ from, to, onChange, error }: Props) {
  const fromId = useId();
  const toId = useId();
  const valid = error === null;
  const count = valid ? monthCount(from, to) : null;

  function applyShortcut(n: number) {
    // Si "Hasta" está vacío o roto, se ancla en el mes actual.
    onChange(shortcutRange(to, n));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-xs text-zinc-500 dark:text-zinc-400">
            Desde
          </label>
          <input
            id={fromId}
            type="month"
            value={from}
            onChange={(e) => onChange({ from: e.target.value, to })}
            aria-invalid={!valid}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-xs text-zinc-500 dark:text-zinc-400">
            Hasta
          </label>
          <input
            id={toId}
            type="month"
            value={to}
            onChange={(e) => onChange({ from, to: e.target.value })}
            aria-invalid={!valid}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Cantidad de meses</span>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {SHORTCUTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => applyShortcut(n)}
                aria-pressed={count === n}
                className={`min-w-[2.5rem] rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  count === n
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {valid && count !== null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {count} {count === 1 ? "mes" : "meses"}:{" "}
          <span className="capitalize">{formatMonthShortLabel(from)}</span> →{" "}
          <span className="capitalize">{formatMonthShortLabel(to)}</span>
          <span className="text-zinc-400 dark:text-zinc-500"> (máximo {MAX_COMPARISON_MONTHS})</span>
        </p>
      ) : (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
