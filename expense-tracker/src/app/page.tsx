"use client";

import { useMemo, useState } from "react";
import { SummaryCards } from "@/components/SummaryCards";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { CURRENCIES, type Currency, type Transaction } from "@/lib/types";

export default function Home() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { income, expenses, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  function handleAdd(input: Omit<Transaction, "id">) {
    setTransactions((prev) => [{ ...input, id: crypto.randomUUID() }, ...prev]);
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Ingresos y gastos
            </h1>
            <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">{monthLabel}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            Moneda
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </header>

        <SummaryCards income={income} expenses={expenses} balance={balance} currency={currency} />

        <TransactionForm onAdd={handleAdd} />

        <TransactionList transactions={transactions} currency={currency} onDelete={handleDelete} />

        <p className="text-center text-xs text-zinc-400">
          Vista preliminar: estos datos viven solo en memoria y se pierden al recargar. La
          persistencia local con SQLite llega en el próximo paso.
        </p>
      </main>
    </div>
  );
}
