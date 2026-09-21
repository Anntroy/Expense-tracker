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
