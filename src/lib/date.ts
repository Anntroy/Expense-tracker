/** "YYYY-MM" */
export type MonthKey = string;

export function currentMonthKey(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(month: MonthKey): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1, 1);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

/** Nombre completo del mes con solo la primera letra en mayúscula, ej. "Septiembre de 2026". */
export function formatMonthTitle(month: MonthKey): string {
  const label = formatMonthLabel(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Etiqueta corta para una pestaña, ej. "sep 26". */
export function formatMonthShortLabel(month: MonthKey): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1, 1);
  const shortMonth = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "");
  return `${shortMonth} ${String(year).slice(2)}`;
}

/** `count` meses consecutivos que terminan en `end`, de más viejo a más nuevo. */
export function monthWindow(end: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(end, i - (count - 1)));
}

/** Primer y último día del mes, como "YYYY-MM-DD", para filtrar por rango. */
export function monthDateRange(month: MonthKey): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** Meses seguidos de `from` a `to`, ambos incluidos, de más viejo a más nuevo. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const count = monthCount(from, to);
  return Array.from({ length: Math.max(count, 0) }, (_, i) => shiftMonth(from, i));
}

/** Cantidad de meses del intervalo `from`..`to`, ambos incluidos (negativo o 0 si está invertido). */
export function monthCount(from: MonthKey, to: MonthKey): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
}

/** Mes de una fecha: "2026-08-15" -> "2026-08". */
export function monthOfDate(date: string): MonthKey {
  return date.slice(0, 7);
}

/**
 * Fin de la ventana de pestañas que deja visible `month`: la misma ventana si ya lo
 * incluye, o una que termina en `month` si quedaba fuera.
 */
export function windowEndShowing(windowEnd: MonthKey, month: MonthKey, size: number): MonthKey {
  return monthWindow(windowEnd, size).includes(month) ? windowEnd : month;
}

/**
 * Intervalo de `count` meses que termina en `anchor`. Si `anchor` no es un mes válido
 * (vacío o a medio escribir) se ancla en `today`.
 */
export function shortcutRange(
  anchor: string,
  count: number,
  today: MonthKey = currentMonthKey(),
): { from: MonthKey; to: MonthKey } {
  const end = /^\d{4}-\d{2}$/.test(anchor) ? anchor : today;
  return { from: shiftMonth(end, -(count - 1)), to: end };
}
