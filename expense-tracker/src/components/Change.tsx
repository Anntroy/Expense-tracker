import { formatPercentChange } from "@/lib/format";

type Props = {
  /** Cambio relativo (0.25 = +25 %); `null` si no hay base de comparación. */
  value: number | null;
};

/**
 * Variación de un gasto respecto al mes anterior. Si sube, es "malo" (rojo); si
 * baja, "bueno" (verde). La flecha y el signo llevan la información, así que
 * el color nunca es el único canal.
 */
export function Change({ value }: Props) {
  if (value === null) {
    return (
      <span className="text-zinc-400 dark:text-zinc-500" title="Sin mes anterior con gasto para comparar">
        —
      </span>
    );
  }
  if (value === 0) {
    return <span className="text-zinc-500 dark:text-zinc-400">0 %</span>;
  }
  const up = value > 0;
  return (
    <span
      className={`whitespace-nowrap tabular-nums ${
        up ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {up ? "▲" : "▼"} {formatPercentChange(value)}
    </span>
  );
}
