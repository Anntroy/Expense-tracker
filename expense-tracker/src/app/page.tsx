"use client";

import { useEffect, useMemo, useState } from "react";
import { SummaryCards } from "@/components/SummaryCards";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { CURRENCIES, type Currency, type Transaction } from "@/lib/types";

export default function Home() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [apiMissing, setApiMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (typeof window === "undefined" || !window.api) {
        if (!cancelled) setApiMissing(true);
        return;
      }
      const list = await window.api.transactions.list();
      if (!cancelled) setTransactions(list);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const { income, expenses, balance } = useMemo(() => {
    const list = transactions ?? [];
    const income = list
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = list
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  async function handleAdd(input: Omit<Transaction, "id">) {
    const created = await window.api.transactions.create(input);
    setTransactions((prev) => [created, ...(prev ?? [])]);
  }

  async function handleDelete(id: number) {
    await window.api.transactions.delete(id);
    setTransactions((prev) => (prev ?? []).filter((t) => t.id !== id));
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

        {apiMissing ? (
          <p className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
            Esta vista necesita ejecutarse dentro de la app de escritorio (
            <code>npm run dev</code>), no en una pestaña de navegador normal: ahí no existe el
            puente <code>window.api</code> que da acceso a los datos guardados.
          </p>
        ) : transactions === null ? (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
        ) : (
          <>
            <SummaryCards
              income={income}
              expenses={expenses}
              balance={balance}
              currency={currency}
            />

            <TransactionForm onAdd={handleAdd} />

            <TransactionList
              transactions={transactions}
              currency={currency}
              onDelete={handleDelete}
            />
          </>
        )}
      </main>
    </div>
  );
}
