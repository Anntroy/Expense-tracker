export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    // "narrowSymbol" evita prefijos de desambiguación como "US$" y muestra "$".
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}

/** Moneda sin decimales, para los ejes de los gráficos (ej. "1.200 €"). */
export function formatCurrencyRounded(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Cambio relativo con signo, ej. 0.25 -> "+25 %". */
export function formatPercentChange(ratio: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(ratio);
}
