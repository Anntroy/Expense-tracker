export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    // "narrowSymbol" evita prefijos de desambiguación como "US$" y muestra "$".
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}
