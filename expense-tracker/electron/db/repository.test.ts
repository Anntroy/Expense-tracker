import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTransactionsRepository } from "./repository";
import * as schema from "./schema";
import type { TransactionInput } from "../../src/lib/schema";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

let sqlite: Database.Database;
let repo: ReturnType<typeof createTransactionsRepository>;

// Cada test usa una base en memoria nueva con las migraciones reales aplicadas,
// así que nunca toca los datos de la app.
beforeEach(() => {
  sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  repo = createTransactionsRepository(db);
});

afterEach(() => {
  sqlite.close();
});

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: "expense",
    amount: 10,
    category: "Comida",
    description: "",
    date: "2026-09-10",
    ...overrides,
  };
}

describe("migrations", () => {
  it("create the transactions table with the columns the code expects", () => {
    const columns = sqlite
      .prepare("select name from pragma_table_info('transactions')")
      .all()
      .map((c) => (c as { name: string }).name);
    expect(columns).toEqual(
      expect.arrayContaining(["id", "type", "amount", "category", "description", "date", "excluded"]),
    );
  });
});

describe("createTransaction", () => {
  it("stores the amount in cents and returns it as a decimal", () => {
    const created = repo.createTransaction(input({ amount: 12.5 }));
    expect(created.amount).toBe(12.5);

    const raw = sqlite.prepare("select amount from transactions where id = ?").get(created.id) as {
      amount: number;
    };
    expect(raw.amount).toBe(1250);
  });

  it("rounds floating-point amounts to the nearest cent", () => {
    // 0.29 * 100 === 28.999999999999996 en punto flotante.
    const created = repo.createTransaction(input({ amount: 0.29 }));
    const raw = sqlite.prepare("select amount from transactions where id = ?").get(created.id) as {
      amount: number;
    };
    expect(raw.amount).toBe(29);
    expect(created.amount).toBe(0.29);
  });

  it("assigns incremental numeric ids and starts as not excluded", () => {
    const first = repo.createTransaction(input());
    const second = repo.createTransaction(input());
    expect(second.id).toBe(first.id + 1);
    expect(first.excluded).toBe(false);
  });

  it("rejects invalid input without writing anything", () => {
    expect(() => repo.createTransaction(input({ amount: 0 }))).toThrow();
    expect(() => repo.createTransaction(input({ category: "   " }))).toThrow();
    expect(repo.listTransactions("2026-09")).toEqual([]);
  });
});

describe("listTransactions", () => {
  it("only returns the requested month, including its first and last day", () => {
    repo.createTransaction(input({ date: "2026-08-31", category: "Agosto" }));
    repo.createTransaction(input({ date: "2026-09-01", category: "Primero" }));
    repo.createTransaction(input({ date: "2026-09-30", category: "Ultimo" }));
    repo.createTransaction(input({ date: "2026-10-01", category: "Octubre" }));

    const categories = repo.listTransactions("2026-09").map((t) => t.category);
    expect(categories.sort()).toEqual(["Primero", "Ultimo"]);
  });

  it("handles the last day of February in leap and non-leap years", () => {
    repo.createTransaction(input({ date: "2028-02-29", category: "Bisiesto" }));
    repo.createTransaction(input({ date: "2026-02-28", category: "Normal" }));

    expect(repo.listTransactions("2028-02").map((t) => t.category)).toEqual(["Bisiesto"]);
    expect(repo.listTransactions("2026-02").map((t) => t.category)).toEqual(["Normal"]);
  });

  it("sorts by date descending and then by id descending", () => {
    repo.createTransaction(input({ date: "2026-09-05", category: "A" }));
    repo.createTransaction(input({ date: "2026-09-20", category: "B" }));
    repo.createTransaction(input({ date: "2026-09-20", category: "C" }));

    expect(repo.listTransactions("2026-09").map((t) => t.category)).toEqual(["C", "B", "A"]);
  });

  it("returns an empty list for a month without transactions", () => {
    expect(repo.listTransactions("2030-01")).toEqual([]);
  });
});

describe("deleteTransaction", () => {
  it("removes only the given transaction", () => {
    const keep = repo.createTransaction(input({ category: "Keep" }));
    const remove = repo.createTransaction(input({ category: "Remove" }));

    repo.deleteTransaction(remove.id);

    expect(repo.listTransactions("2026-09").map((t) => t.id)).toEqual([keep.id]);
  });

  it("does nothing when the id does not exist", () => {
    repo.createTransaction(input());
    expect(() => repo.deleteTransaction(999)).not.toThrow();
    expect(repo.listTransactions("2026-09")).toHaveLength(1);
  });
});

describe("setTransactionExcluded", () => {
  it("deactivates and reactivates only the given transaction", () => {
    const target = repo.createTransaction(input({ category: "Target" }));
    const other = repo.createTransaction(input({ category: "Other" }));

    repo.setTransactionExcluded(target.id, true);
    let byId = new Map(repo.listTransactions("2026-09").map((t) => [t.id, t]));
    expect(byId.get(target.id)?.excluded).toBe(true);
    expect(byId.get(other.id)?.excluded).toBe(false);

    repo.setTransactionExcluded(target.id, false);
    byId = new Map(repo.listTransactions("2026-09").map((t) => [t.id, t]));
    expect(byId.get(target.id)?.excluded).toBe(false);
  });

  it("keeps the transaction in the list (it is not deleted)", () => {
    const created = repo.createTransaction(input());
    repo.setTransactionExcluded(created.id, true);
    expect(repo.listTransactions("2026-09")).toHaveLength(1);
  });

  it("rejects invalid ids and flags", () => {
    expect(() => repo.setTransactionExcluded(0, true)).toThrow();
    expect(() => repo.setTransactionExcluded(1.5, true)).toThrow();
    expect(() => repo.setTransactionExcluded(1, "yes" as unknown as boolean)).toThrow();
  });
});

describe("listCategories", () => {
  it("returns the distinct categories already used for the given type", () => {
    repo.createTransaction(input({ type: "expense", category: "Comida" }));
    repo.createTransaction(input({ type: "expense", category: "Comida" }));
    repo.createTransaction(input({ type: "expense", category: "Mascotas" }));
    repo.createTransaction(input({ type: "income", category: "Salario" }));

    expect(repo.listCategories("expense").sort()).toEqual(["Comida", "Mascotas"]);
    expect(repo.listCategories("income")).toEqual(["Salario"]);
  });

  it("returns an empty list when nothing was used yet", () => {
    expect(repo.listCategories("expense")).toEqual([]);
  });
});
