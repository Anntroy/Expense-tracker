"use client";

import { useState } from "react";
import { formatMonthShortLabel, monthWindow, shiftMonth, type MonthKey } from "@/lib/date";

const WINDOW_SIZE = 6;

type Props = {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
};

export function MonthNav({ month, onChange }: Props) {
  const [windowEnd, setWindowEnd] = useState<MonthKey>(month);
  const months = monthWindow(windowEnd, WINDOW_SIZE);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => setWindowEnd(shiftMonth(windowEnd, -1))}
        aria-label="Meses anteriores"
        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {months.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`min-w-[3.5rem] rounded-md px-2 py-1.5 text-sm font-medium capitalize transition-colors ${
              m === month
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {formatMonthShortLabel(m)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setWindowEnd(shiftMonth(windowEnd, 1))}
        aria-label="Meses siguientes"
        className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
