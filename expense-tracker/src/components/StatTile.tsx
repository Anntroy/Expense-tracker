import type { ReactNode } from "react";

/** Cifra resumen pequeña: título, valor y, opcionalmente, un detalle debajo. */
export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {detail && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
    </div>
  );
}
