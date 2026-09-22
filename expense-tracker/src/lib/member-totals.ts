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

/**
 * Valor del selector "Quién" del formulario. Sin elección todavía (`null`) o si el miembro
 * elegido ya no está disponible, se propone el primero. "" es "Sin asignar" elegido a mano
 * y se respeta.
 */
export function resolveMemberChoice(chosen: string | null, members: Pick<Member, "id">[]): string {
  if (chosen === "") return "";
  if (chosen !== null && members.some((m) => String(m.id) === chosen)) return chosen;
  return members[0] ? String(members[0].id) : "";
}
