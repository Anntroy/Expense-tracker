import { personOptions, type PersonFilter } from "@/lib/member-totals";
import type { Member } from "@/lib/types";

type Props = {
  value: PersonFilter;
  onChange: (value: PersonFilter) => void;
  members: Member[];
  className?: string;
};

/** Selector de persona para filtrar: todas, un miembro (también archivados) o "Sin asignar". */
export function PersonSelect({ value, onChange, members, className = "" }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Persona"
      className={`rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 ${className}`}
    >
      {personOptions(members).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
