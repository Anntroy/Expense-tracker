"use client";

import { useState, type FormEvent } from "react";
import { TransactionInputSchema } from "@/lib/schema";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
  type TransactionType,
} from "@/lib/types";

type Props = {
  onAdd: (input: Omit<Transaction, "id">) => void;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function TransactionForm({ onAdd }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategory("");
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
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

    onAdd(result.data);
    setAmount("");
    setDescription("");
    setError(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            type === "expense"
              ? "bg-red-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            type === "income"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Ingreso
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Cantidad
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            placeholder="0.00"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError(null);
            }}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Categoría
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setError(null);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">Elegí una categoría</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Descripción (opcional)
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: supermercado"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Agregar movimiento
      </button>
    </form>
  );
}
