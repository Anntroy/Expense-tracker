"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryDonut } from "@/components/CategoryDonut";
import { MonthNav } from "@/components/MonthNav";
import { SummaryCards } from "@/components/SummaryCards";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { currentMonthKey, formatMonthLabel, type MonthKey } from "@/lib/date";
import { CURRENCIES, type Currency, type Transaction } from "@/lib/types";

function fetchMonth(month: MonthKey): Promise<Transaction[] | null> {
  if (typeof window === "undefined" || !window.api) {
    return Promise.resolve(null);
  }
  return window.api.transactions.list(month);
}

export default function Home() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [month, setMonth] = useState<MonthKey>(() => currentMonthKey());
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [apiMissing, setApiMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchMonth(month).then((list) => {
      if (cancelled) return;
      if (list === null) setApiMissing(true);
      else setTransactions(list);
    });

    return () => {
      cancelled = true;
    };
  }, [month]);

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
    await window.api.transactions.create(input);
    const list = await fetchMonth(month);
    if (list) setTransactions(list);
  }

  async function handleDelete(id: number) {
    await window.api.transactions.delete(id);
    const list = await fetchMonth(month);
    if (list) setTransactions(list);
  }

  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Ingresos y gastos
            </h1>
            <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
              {formatMonthLabel(month)}
            </p>
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

        <MonthNav month={month} onChange={setMonth} />

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

            <CategoryDonut transactions={transactions} currency={currency} />

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
