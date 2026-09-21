"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { TransactionInputSchema, type TransactionInput } from "@/lib/schema";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionType,
} from "@/lib/types";

type Props = {
  onAdd: (input: TransactionInput) => void | Promise<void>;
  /** Se llama al elegir una fecha completa, para que la vista pueda mostrar el mes correspondiente. */
  onDateChange?: (date: string) => void;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function fetchCategories(type: TransactionType): Promise<string[]> {
  if (typeof window === "undefined" || !window.api) return Promise.resolve([]);
  return window.api.transactions.categories(type);
}

export function TransactionForm({ onAdd, onDateChange }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const categoryListId = useId();

  useEffect(() => {
    fetchCategories(type).then(setUsedCategories);
  }, [type]);

  const categories = useMemo(() => {
    const base = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const extra = usedCategories.filter((c) => !base.includes(c));
    return [...base, ...extra];
  }, [type, usedCategories]);

  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategory("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const result = TransactionInputSchema.safeParse({
      type,
      amount: Number(amount),
      category,
      description,
      date,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    await onAdd(result.data);
    setAmount("");
    setCategory("");
    setDescription("");
    setError(null);
    fetchCategories(type).then(setUsedCategories);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={type === "income"}
          aria-label="Tipo de movimiento"
          onClick={() =>
            handleTypeChange(type === "income" ? "expense" : "income")
          }
          className="flex w-24 shrink-0 items-center gap-2 py-2 text-sm font-medium"
        >
          <span
            className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${
              type === "income" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                type === "income" ? "translate-x-4" : ""
              }`}
            />
          </span>
          <span
            className={
              type === "income"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }
          >
            {type === "income" ? "Ingreso" : "Gasto"}
          </span>
        </button>

        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          placeholder="Cantidad"
          aria-label="Cantidad"
          className="w-24 shrink-0 rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
            // Un <input type="date"> incompleto devuelve "": solo se avisa con fecha completa.
            if (e.target.value) onDateChange?.(e.target.value);
          }}
          aria-label="Fecha"
          className="w-36 shrink-0 rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />

        <input
          type="text"
          list={categoryListId}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setError(null);
          }}
          placeholder="Categoría"
          aria-label="Categoría"
          className="min-w-[8rem] flex-1 rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <datalist id={categoryListId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          aria-label="Descripción"
          className="min-w-[10rem] flex-1 rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />

        <button
          type="submit"
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Agregar
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
