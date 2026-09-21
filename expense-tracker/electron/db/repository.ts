import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { transactions } from "./schema";
import { SetExcludedSchema, TransactionInputSchema, type TransactionInput } from "../../src/lib/schema";
import { monthDateRange, type MonthKey } from "../../src/lib/date";
import type { Transaction, TransactionType } from "../../src/lib/types";

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
  };
}

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
      const row = db
        .insert(transactions)
        .values({
          type: parsed.type,
          amount: Math.round(parsed.amount * 100),
          category: parsed.category,
          description: parsed.description,
          date: parsed.date,
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
