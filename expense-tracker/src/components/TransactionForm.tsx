"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { TransactionInputSchema, type TransactionInput } from "@/lib/schema";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  SAVING_CATEGORIES,
  type Member,
  type TransactionType,
} from "@/lib/types";

type Props = {
  onAdd: (input: TransactionInput) => void | Promise<void>;
  /** Se llama al elegir una fecha completa, para que la vista pueda mostrar el mes correspondiente. */
  onDateChange?: (date: string) => void;
  /** Miembros que se pueden elegir (activos). Sin miembros, el campo "Quién" no aparece. */
  members?: Member[];
};

const TYPE_OPTIONS: { value: TransactionType; label: string; active: string }[] = [
  { value: "income", label: "Ingreso", active: "bg-emerald-600 text-white" },
  { value: "expense", label: "Gasto", active: "bg-red-600 text-white" },
  { value: "saving", label: "Ahorro", active: "bg-sky-600 text-white" },
];

const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  saving: SAVING_CATEGORIES,
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function fetchCategories(type: TransactionType): Promise<string[]> {
  if (typeof window === "undefined" || !window.api) return Promise.resolve([]);
  return window.api.transactions.categories(type);
}

export function TransactionForm({ onAdd, onDateChange, members = [] }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  // `null` = todavía no se eligió: se propone el primer miembro. "" = "Sin asignar" elegido a mano.
  const [chosenMember, setChosenMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const categoryListId = useId();

  const firstMember = members[0] ? String(members[0].id) : "";
  const memberValue =
    chosenMember === "" || members.some((m) => String(m.id) === chosenMember)
      ? (chosenMember as string)
      : firstMember;

  useEffect(() => {
    fetchCategories(type).then(setUsedCategories);
  }, [type]);

  const categories = useMemo(() => {
    const base = CATEGORIES_BY_TYPE[type];
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
      memberId: memberValue === "" ? null : Number(memberValue),
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    await onAdd(result.data);
    setChosenMember(memberValue);
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
        <div
          role="radiogroup"
          aria-label="Tipo de movimiento"
          className="flex shrink-0 rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700"
        >
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              onClick={() => handleTypeChange(option.value)}
              className={`rounded px-2.5 py-1.5 text-sm font-medium transition-colors ${
                type === option.value
                  ? option.active
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

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

        {members.length > 0 && (
          <select
            value={memberValue}
            onChange={(e) => {
              setChosenMember(e.target.value);
              setError(null);
            }}
            aria-label="Quién"
            className="w-32 shrink-0 rounded-md border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

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
