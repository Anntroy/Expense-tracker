import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { members, transactions } from "./schema";
import {
  MAX_MEMBERS,
  MemberFilterSchema,
  MemberIdSchema,
  MemberNameSchema,
  MonthRangeSchema,
  SetExcludedSchema,
  TransactionInputSchema,
  type MonthRange,
  type TransactionInput,
} from "../../src/lib/schema";
import { monthDateRange, type MonthKey } from "../../src/lib/date";
import type { CategoryMonthTotal, Member, Transaction, TransactionType } from "../../src/lib/types";

export type Db = BetterSQLite3Database<typeof schema>;

function toPublic(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount / 100,
    category: row.category,
    description: row.description,
    date: row.date,
    excluded: row.excluded,
    memberId: row.memberId,
  };
}

const sameName = (a: string, b: string) => a.toLocaleLowerCase("es") === b.toLocaleLowerCase("es");

/**
 * Operaciones sobre la tabla `transactions`. Recibe la base como parámetro (en
 * vez de importarla de `client.ts`, que depende de Electron) para poder usarla
 * también con una base en memoria en los tests.
 */
export function createTransactionsRepository(db: Db) {
  return {
    listTransactions(month: MonthKey): Transaction[] {
      const { from, to } = monthDateRange(month);
      const rows = db
        .select()
        .from(transactions)
        .where(and(gte(transactions.date, from), lte(transactions.date, to)))
        .orderBy(desc(transactions.date), desc(transactions.id))
        .all();
      return rows.map(toPublic);
    },

    createTransaction(input: TransactionInput): Transaction {
      const parsed = TransactionInputSchema.parse(input);
      if (parsed.memberId !== null) {
        const member = db.select().from(members).where(eq(members.id, parsed.memberId)).get();
        if (!member || member.archived) throw new Error("Ese miembro no existe o está archivado.");
      }
      const row = db
        .insert(transactions)
        .values({
          type: parsed.type,
          amount: Math.round(parsed.amount * 100),
          category: parsed.category,
          description: parsed.description,
          date: parsed.date,
          memberId: parsed.memberId,
        })
        .returning()
        .get();
      return toPublic(row);
    },

    deleteTransaction(id: number): void {
      db.delete(transactions).where(eq(transactions.id, id)).run();
    },

    /** Activa o desactiva un movimiento: desactivado no cuenta en totales ni gráficos. */
    setTransactionExcluded(id: number, excluded: boolean): void {
      const parsed = SetExcludedSchema.parse({ id, excluded });
      db.update(transactions)
        .set({ excluded: parsed.excluded })
        .where(eq(transactions.id, parsed.id))
        .run();
    },

    /**
     * Gasto por mes y categoría en un intervalo de meses, ignorando ingresos y
     * movimientos desactivados. Solo devuelve los pares que tienen gasto: rellenar
     * con 0 los meses vacíos es cosa de `buildComparison`.
     *
     * `memberId` filtra por persona: omitido = todas, `null` = sin asignar, número = ese miembro.
     */
    summaryByCategory(range: MonthRange, memberId?: number | null): CategoryMonthTotal[] {
      const { from, to } = MonthRangeSchema.parse(range);
      const member = MemberFilterSchema.parse(memberId);
      const memberCondition =
        member === undefined
          ? undefined
          : member === null
            ? isNull(transactions.memberId)
            : eq(transactions.memberId, member);
      const month = sql<string>`substr(${transactions.date}, 1, 7)`;
      const rows = db
        .select({
          month,
          category: transactions.category,
          cents: sql<number>`sum(${transactions.amount})`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, "expense"),
            eq(transactions.excluded, false),
            gte(transactions.date, monthDateRange(from).from),
            lte(transactions.date, monthDateRange(to).to),
            memberCondition,
          ),
        )
        .groupBy(month, transactions.category)
        .all();
      return rows.map((r) => ({ month: r.month, category: r.category, amount: r.cents / 100 }));
    },

    /** Todos los miembros: primero los activos y luego los archivados, cada grupo por orden de alta. */
    listMembers(): Member[] {
      return db
        .select()
        .from(members)
        .orderBy(members.archived, members.id)
        .all();
    },

    /** Alta de miembro: como mucho `MAX_MEMBERS` activos y sin repetir nombre (aunque el otro esté archivado). */
    createMember(name: string): Member {
      const parsedName = MemberNameSchema.parse(name);
      const all = db.select().from(members).all();
      if (all.filter((m) => !m.archived).length >= MAX_MEMBERS) {
        throw new Error(`Ya hay ${MAX_MEMBERS} miembros activos. Archivá uno para añadir otro.`);
      }
      if (all.some((m) => sameName(m.name, parsedName))) {
        throw new Error("Ya existe un miembro con ese nombre (puede estar archivado).");
      }
      return db.insert(members).values({ name: parsedName }).returning().get();
    },

    renameMember(id: number, name: string): void {
      const parsedId = MemberIdSchema.parse(id);
      const parsedName = MemberNameSchema.parse(name);
      const all = db.select().from(members).all();
      if (!all.some((m) => m.id === parsedId)) throw new Error("Ese miembro no existe.");
      if (all.some((m) => m.id !== parsedId && sameName(m.name, parsedName))) {
        throw new Error("Ya existe un miembro con ese nombre (puede estar archivado).");
      }
      db.update(members).set({ name: parsedName }).where(eq(members.id, parsedId)).run();
    },

    /** Archiva o restaura un miembro. Restaurar respeta el máximo de activos. */
    setMemberArchived(id: number, archived: boolean): void {
      const parsedId = MemberIdSchema.parse(id);
      const all = db.select().from(members).all();
      const target = all.find((m) => m.id === parsedId);
      if (!target) throw new Error("Ese miembro no existe.");
      if (!archived && target.archived && all.filter((m) => !m.archived).length >= MAX_MEMBERS) {
        throw new Error(`Ya hay ${MAX_MEMBERS} miembros activos. Archivá uno para restaurar este.`);
      }
      db.update(members).set({ archived }).where(eq(members.id, parsedId)).run();
    },

    /** Categorías ya usadas alguna vez para ese tipo, para sugerirlas en el formulario. */
    listCategories(type: TransactionType): string[] {
      const rows = db
        .selectDistinct({ category: transactions.category })
        .from(transactions)
        .where(eq(transactions.type, type))
        .all();
      return rows.map((r) => r.category);
    },
  };
}
