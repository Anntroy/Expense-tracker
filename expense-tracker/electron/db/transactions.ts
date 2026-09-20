import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { transactions } from "./schema";
import { TransactionInputSchema, type TransactionInput } from "../../src/lib/schema";
import type { Transaction } from "../../src/lib/types";

function toPublic(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount / 100,
    category: row.category,
    description: row.description,
    date: row.date,
  };
}

export function listTransactions(): Transaction[] {
  const rows = db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();
  return rows.map(toPublic);
}

export function createTransaction(input: TransactionInput): Transaction {
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
}

export function deleteTransaction(id: number): void {
  db.delete(transactions).where(eq(transactions.id, id)).run();
}
