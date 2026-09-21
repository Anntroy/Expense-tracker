"use client";

import { useState } from "react";
import { ComparisonView } from "@/components/ComparisonView";
import { MonthView } from "@/components/MonthView";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TabBar, type TabId } from "@/components/TabBar";
import { currentMonthKey, formatMonthTitle, type MonthKey } from "@/lib/date";
import { useMembers } from "@/lib/use-members";
import { CURRENCIES, type Currency } from "@/lib/types";

export default function Home() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [tab, setTab] = useState<TabId>("month");
  const [month, setMonth] = useState<MonthKey>(() => currentMonthKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { members, refresh: refreshMembers } = useMembers();

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
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configuración"
              title="Configuración"
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        <TabBar active={tab} onChange={setTab} />

        {/* Las dos vistas se mantienen montadas para conservar su estado al cambiar de pestaña. */}
        <div role="tabpanel" id="panel-month" aria-labelledby="tab-month" hidden={tab !== "month"}>
          <MonthView month={month} onMonthChange={setMonth} currency={currency} members={members} />
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

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        members={members}
        onMembersChanged={refreshMembers}
      />
    </div>
  );
}
