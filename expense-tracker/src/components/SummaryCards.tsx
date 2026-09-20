import { formatCurrency } from "@/lib/format";

type Props = {
  income: number;
  expenses: number;
  balance: number;
  currency: string;
};

export function SummaryCards({ income, expenses, balance, currency }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard label="Ingresos" value={income} currency={currency} tone="emerald" />
      <SummaryCard label="Gastos" value={expenses} currency={currency} tone="red" />
      <SummaryCard
        label="Balance"
        value={balance}
        currency={currency}
        tone={balance >= 0 ? "emerald" : "red"}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone: "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>
        {formatCurrency(value, currency)}
      </p>
    </div>
  );
}
