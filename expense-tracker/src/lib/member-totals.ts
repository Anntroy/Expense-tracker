import { roundCents } from "./money";
import type { Member, Transaction } from "./types";

/** Filtro por persona en la interfaz: "" = todas, "none" = sin asignar, o el id del miembro como texto. */
export type PersonFilter = string;

export const ALL_PEOPLE: PersonFilter = "";
export const UNASSIGNED: PersonFilter = "none";

/** ¿El movimiento pertenece a la persona del filtro? */
export function matchesPerson(transaction: Pick<Transaction, "memberId">, filter: PersonFilter): boolean {
  if (filter === ALL_PEOPLE) return true;
  if (filter === UNASSIGNED) return transaction.memberId === null;
  return String(transaction.memberId) === filter;
}

/** Filtro de la interfaz -> parámetro de las consultas (omitido = todas, null = sin asignar, número = miembro). */
export function filterToMemberId(filter: PersonFilter): number | null | undefined {
  if (filter === ALL_PEOPLE) return undefined;
  if (filter === UNASSIGNED) return null;
  return Number(filter);
}

export type MemberTotals = {
  /** Valor de filtro que corresponde a esta fila (`String(id)` o `UNASSIGNED`). */
  key: PersonFilter;
  name: string;
  archived: boolean;
  income: number;
  expenses: number;
  balance: number;
};

/**
 * Ingresos, gastos y balance por persona. Ignora los movimientos desactivados.
 * Salen todos los miembros activos (aunque estén a 0) y los archivados o "Sin
 * asignar" solo si tienen movimientos. Orden: miembros en el orden recibido y
 * "Sin asignar" al final.
 */
export function totalsByMember(transactions: Transaction[], members: Member[]): MemberTotals[] {
  const rows = new Map<PersonFilter, MemberTotals>();
  for (const m of members) {
    rows.set(String(m.id), { key: String(m.id), name: m.name, archived: m.archived, income: 0, expenses: 0, balance: 0 });
  }
  const unassigned: MemberTotals = { key: UNASSIGNED, name: "Sin asignar", archived: false, income: 0, expenses: 0, balance: 0 };
  const used = new Set<PersonFilter>();

  for (const t of transactions) {
    if (t.excluded) continue;
    const key = t.memberId === null ? UNASSIGNED : String(t.memberId);
    const row = key === UNASSIGNED ? unassigned : rows.get(key);
    if (!row) continue; // miembro desconocido: no debería pasar
    if (t.type === "income") row.income += t.amount;
    else row.expenses += t.amount;
    used.add(key);
  }

  const result = [...rows.values()].filter((r) => !r.archived || used.has(r.key));
  if (used.has(UNASSIGNED)) result.push(unassigned);

  return result.map((r) => ({
    ...r,
    income: roundCents(r.income),
    expenses: roundCents(r.expenses),
    balance: roundCents(r.income - r.expenses),
  }));
}

/** Opciones del selector de persona: todas, cada miembro (los archivados se marcan) y "Sin asignar". */
export function personOptions(members: Member[]): { value: PersonFilter; label: string }[] {
  return [
    { value: ALL_PEOPLE, label: "Todas las personas" },
    ...members.map((m) => ({ value: String(m.id), label: m.archived ? `${m.name} (archivado)` : m.name })),
    { value: UNASSIGNED, label: "Sin asignar" },
  ];
}

/** Nombre legible de la persona de un filtro (para avisos como "Mostrando solo: Ana"). */
export function personLabel(filter: PersonFilter, members: Member[]): string {
  return personOptions(members).find((o) => o.value === filter)?.label ?? "";
}
