import { monthOfDate, type MonthKey } from "./date";
import { ALL_PEOPLE, matchesPerson, type PersonFilter } from "./member-totals";

export type MonthViewState = { month: MonthKey; person: PersonFilter };

/**
 * Cómo debe quedar la vista del mes tras agregar un movimiento, para que se vea enseguida:
 * pasa al mes de su fecha y, si el filtro de persona lo ocultaría, se quita el filtro.
 */
export function viewAfterAdd(
  added: { date: string; memberId: number | null },
  view: MonthViewState,
): MonthViewState {
  return {
    month: monthOfDate(added.date),
    person: matchesPerson(added, view.person) ? view.person : ALL_PEOPLE,
  };
}
