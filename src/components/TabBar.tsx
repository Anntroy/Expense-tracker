export type TabId = "month" | "comparison" | "savings";

const TABS: { id: TabId; label: string }[] = [
  { id: "month", label: "Ingresos y gastos" },
  { id: "comparison", label: "Comparación por categoría" },
  { id: "savings", label: "Ahorro" },
];

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
