import { formatCurrency } from "@/lib/format";

type Props = {
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  currency: string;
};

export function SummaryCards({ income, expenses, savings, balance, currency }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <SummaryCard label="Ingresos" value={income} currency={currency} tone="emerald" />
      <SummaryCard label="Gastos" value={expenses} currency={currency} tone="red" />
      <SummaryCard label="Ahorro" value={savings} currency={currency} tone="sky" />
      <SummaryCard
        label="Balance"
        value={balance}
        currency={currency}
        tone={balance >= 0 ? "emerald" : "red"}
        hint={savings > 0 ? "Tras descontar el ahorro" : undefined}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  tone,
  hint,
}: {
  label: string;
  value: number;
  currency: string;
  tone: "emerald" | "red" | "sky";
  hint?: string;
}) {
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    sky: "text-sky-600 dark:text-sky-400",
  }[tone];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>
        {formatCurrency(value, currency)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}
