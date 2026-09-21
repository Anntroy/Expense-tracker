"use client";

import { useState } from "react";
import { ComparisonView } from "@/components/ComparisonView";
import { MonthView } from "@/components/MonthView";
import { TabBar, type TabId } from "@/components/TabBar";
import { currentMonthKey, formatMonthTitle, type MonthKey } from "@/lib/date";
import { CURRENCIES, type Currency } from "@/lib/types";

export default function Home() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [tab, setTab] = useState<TabId>("month");
  const [month, setMonth] = useState<MonthKey>(() => currentMonthKey());

  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-black">
      <main
        className={`mx-auto flex w-full flex-col gap-6 px-6 py-10 ${
          tab === "comparison" ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Ingresos y gastos
            </h1>
            {tab === "month" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatMonthTitle(month)}</p>
            )}
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

        <TabBar active={tab} onChange={setTab} />

        {/* Las dos vistas se mantienen montadas para conservar su estado al cambiar de pestaña. */}
        <div role="tabpanel" id="panel-month" aria-labelledby="tab-month" hidden={tab !== "month"}>
          <MonthView month={month} onMonthChange={setMonth} currency={currency} />
        </div>
        <div
          role="tabpanel"
          id="panel-comparison"
          aria-labelledby="tab-comparison"
          hidden={tab !== "comparison"}
        >
          <ComparisonView currency={currency} active={tab === "comparison"} />
        </div>
      </main>
    </div>
  );
}
