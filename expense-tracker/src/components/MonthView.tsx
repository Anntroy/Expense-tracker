"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiMissingNotice } from "@/components/ApiMissingNotice";
import { CategoryDonut } from "@/components/CategoryDonut";
import { MonthNav } from "@/components/MonthNav";
import { SummaryCards } from "@/components/SummaryCards";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import type { MonthKey } from "@/lib/date";
import type { TransactionInput } from "@/lib/schema";
import type { Transaction } from "@/lib/types";

function fetchMonth(month: MonthKey): Promise<Transaction[] | null> {
  if (typeof window === "undefined" || !window.api) {
    return Promise.resolve(null);
  }
  return window.api.transactions.list(month);
}

type Props = {
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  currency: string;
};

export function MonthView({ month, onMonthChange, currency }: Props) {
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
    // Los movimientos desactivados no cuentan en el recuento.
    const list = (transactions ?? []).filter((t) => !t.excluded);
    const income = list
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = list
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  // Muestra el mes al que pertenece una fecha ("YYYY-MM-DD" -> "YYYY-MM").
  function showMonthOf(date: string) {
    const target = date.slice(0, 7);
    if (target !== month) onMonthChange(target);
  }

  async function handleAdd(input: TransactionInput) {
    await window.api.transactions.create(input);
    if (input.date.slice(0, 7) !== month) {
      // El movimiento cae en otro mes: se pasa a ese mes (el efecto recarga la lista).
      showMonthOf(input.date);
      return;
    }
    const list = await fetchMonth(month);
    if (list) setTransactions(list);
  }

  async function handleDelete(id: number) {
    await window.api.transactions.delete(id);
    const list = await fetchMonth(month);
    if (list) setTransactions(list);
  }

  async function handleToggleExcluded(id: number, excluded: boolean) {
    await window.api.transactions.setExcluded(id, excluded);
    const list = await fetchMonth(month);
    if (list) setTransactions(list);
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthNav month={month} onChange={onMonthChange} />

      {apiMissing ? (
        <ApiMissingNotice />
      ) : transactions === null ? (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
      ) : (
        <>
          <SummaryCards income={income} expenses={expenses} balance={balance} currency={currency} />

          <TransactionForm onAdd={handleAdd} onDateChange={showMonthOf} />

          <CategoryDonut transactions={transactions} currency={currency} />

          <TransactionList
            transactions={transactions}
            currency={currency}
            onDelete={handleDelete}
            onToggleExcluded={handleToggleExcluded}
          />
        </>
      )}
    </div>
  );
}
