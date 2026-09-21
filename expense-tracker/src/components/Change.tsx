import { formatPercentChange } from "@/lib/format";

type Props = {
  /** Cambio relativo (0.25 = +25 %); `null` si no hay base de comparación. */
  value: number | null;
  /** Subir es bueno (p. ej. el ahorro): invierte los colores. Por defecto subir es malo (un gasto). */
  upIsGood?: boolean;
};

/**
 * Variación respecto al mes anterior. En un gasto, si sube es "malo" (rojo) y si baja
 * "bueno" (verde); con `upIsGood` (ahorro) es al revés. La flecha y el signo llevan la información, así que
 * el color nunca es el único canal.
 */
export function Change({ value, upIsGood = false }: Props) {
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
  const good = up === upIsGood;
  return (
    <span
      className={`whitespace-nowrap tabular-nums ${
        good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {up ? "▲" : "▼"} {formatPercentChange(value)}
    </span>
  );
}
