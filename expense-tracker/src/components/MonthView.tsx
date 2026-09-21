"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiMissingNotice } from "@/components/ApiMissingNotice";
import { CategoryDonut } from "@/components/CategoryDonut";
import { MemberBreakdown } from "@/components/MemberBreakdown";
import { MonthNav } from "@/components/MonthNav";
import { SummaryCards } from "@/components/SummaryCards";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import type { MonthKey } from "@/lib/date";
import { ALL_PEOPLE, matchesPerson, personLabel, type PersonFilter } from "@/lib/member-totals";
import type { TransactionInput } from "@/lib/schema";
import type { Member, Transaction } from "@/lib/types";

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
  /** Todos los miembros del hogar (activos y archivados). */
  members: Member[];
};

export function MonthView({ month, onMonthChange, currency, members }: Props) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [apiMissing, setApiMissing] = useState(false);
  const [person, setPerson] = useState<PersonFilter>(ALL_PEOPLE);

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

  // Con un filtro de persona, todo lo que se muestra (cifras, gráfico y lista) se acota a esa persona.
  const visible = useMemo(
    () => (transactions ?? []).filter((t) => matchesPerson(t, person)),
    [transactions, person],
  );

  const { income, expenses, balance } = useMemo(() => {
    // Los movimientos desactivados no cuentan en el recuento.
    const list = visible.filter((t) => !t.excluded);
    const income = list
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = list
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [visible]);

  // Muestra el mes al que pertenece una fecha ("YYYY-MM-DD" -> "YYYY-MM").
  function showMonthOf(date: string) {
    const target = date.slice(0, 7);
    if (target !== month) onMonthChange(target);
  }

  async function handleAdd(input: TransactionInput) {
    await window.api.transactions.create(input);
    // Si el movimiento nuevo quedaría oculto por el filtro de persona, se quita el filtro para que se vea.
    if (!matchesPerson(input, person)) setPerson(ALL_PEOPLE);
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
          {person !== ALL_PEOPLE && (
            <p className="flex items-center justify-between gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <span>
                Mostrando solo: <strong>{personLabel(person, members)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPerson(ALL_PEOPLE)}
                className="text-xs font-medium underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Quitar filtro
              </button>
            </p>
          )}

          <SummaryCards income={income} expenses={expenses} balance={balance} currency={currency} />

          {members.length > 0 && (
            <MemberBreakdown
              transactions={transactions}
              members={members}
              currency={currency}
              filter={person}
              onFilterChange={setPerson}
            />
          )}

          <TransactionForm
            onAdd={handleAdd}
            onDateChange={showMonthOf}
            members={members.filter((m) => !m.archived)}
          />

          <CategoryDonut transactions={visible} currency={currency} />

          <TransactionList
            transactions={visible}
            currency={currency}
            members={members}
            emptyMessage={
              person !== ALL_PEOPLE && transactions.length > 0
                ? "Esta persona no tiene movimientos este mes."
                : undefined
            }
            onDelete={handleDelete}
            onToggleExcluded={handleToggleExcluded}
          />
        </>
      )}
    </div>
  );
}
