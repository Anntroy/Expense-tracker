import { readdirSync, readFileSync } from "node:fs";
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
    memberId: null,
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

describe("summaryByCategory", () => {
  it("groups expenses by month and category", () => {
    repo.createTransaction(input({ date: "2026-08-05", category: "Comida", amount: 10 }));
    repo.createTransaction(input({ date: "2026-08-20", category: "Comida", amount: 15.5 }));
    repo.createTransaction(input({ date: "2026-09-02", category: "Comida", amount: 7 }));
    repo.createTransaction(input({ date: "2026-08-11", category: "Ocio", amount: 30 }));

    const rows = repo.summaryByCategory({ from: "2026-08", to: "2026-09" });
    const key = (r: { month: string; category: string }) => `${r.month}/${r.category}`;
    expect(Object.fromEntries(rows.map((r) => [key(r), r.amount]))).toEqual({
      "2026-08/Comida": 25.5,
      "2026-09/Comida": 7,
      "2026-08/Ocio": 30,
    });
  });

  it("ignores income and deactivated transactions", () => {
    repo.createTransaction(input({ type: "income", category: "Salario", amount: 2000 }));
    const off = repo.createTransaction(input({ category: "Comida", amount: 99 }));
    repo.createTransaction(input({ category: "Comida", amount: 1 }));
    repo.setTransactionExcluded(off.id, true);

    expect(repo.summaryByCategory({ from: "2026-09", to: "2026-09" })).toEqual([
      { month: "2026-09", category: "Comida", amount: 1 },
    ]);
  });

  it("includes the first day of `from` and the last day of `to`, and nothing beyond", () => {
    repo.createTransaction(input({ date: "2026-07-31", category: "Antes" }));
    repo.createTransaction(input({ date: "2026-08-01", category: "Inicio" }));
    repo.createTransaction(input({ date: "2026-09-30", category: "Fin" }));
    repo.createTransaction(input({ date: "2026-10-01", category: "Despues" }));

    const categories = repo.summaryByCategory({ from: "2026-08", to: "2026-09" }).map((r) => r.category);
    expect(categories.sort()).toEqual(["Fin", "Inicio"]);
  });

  it("does not return months or categories without spending", () => {
    expect(repo.summaryByCategory({ from: "2026-01", to: "2026-03" })).toEqual([]);
  });

  describe("filtering by person", () => {
    beforeEach(() => {
      const ana = repo.createMember("Ana");
      const luis = repo.createMember("Luis");
      repo.createTransaction(input({ category: "Comida", amount: 10, memberId: ana.id }));
      repo.createTransaction(input({ category: "Comida", amount: 20, memberId: luis.id }));
      repo.createTransaction(input({ category: "Ocio", amount: 5 })); // sin asignar
    });

    const total = (rows: { amount: number }[]) => rows.reduce((sum, r) => sum + r.amount, 0);
    const range = { from: "2026-09", to: "2026-09" };

    it("returns everyone when no filter is given", () => {
      expect(total(repo.summaryByCategory(range))).toBe(35);
    });

    it("returns only the chosen member", () => {
      const ana = repo.listMembers().find((m) => m.name === "Ana")!;
      expect(repo.summaryByCategory(range, ana.id)).toEqual([
        { month: "2026-09", category: "Comida", amount: 10 },
      ]);
    });

    it("returns only unassigned movements with null", () => {
      expect(repo.summaryByCategory(range, null)).toEqual([
        { month: "2026-09", category: "Ocio", amount: 5 },
      ]);
    });

    it("returns nothing for a member without expenses, and rejects invalid ids", () => {
      expect(repo.summaryByCategory(range, 999)).toEqual([]);
      expect(() => repo.summaryByCategory(range, 0)).toThrow();
      expect(() => repo.summaryByCategory(range, 1.5)).toThrow();
    });

    it("still ignores deactivated transactions when filtering", () => {
      const luis = repo.listMembers().find((m) => m.name === "Luis")!;
      const luisTx = repo.listTransactions("2026-09").find((t) => t.memberId === luis.id)!;
      repo.setTransactionExcluded(luisTx.id, true);
      expect(repo.summaryByCategory(range, luis.id)).toEqual([]);
    });
  });

  it("rejects an invalid range", () => {
    expect(() => repo.summaryByCategory({ from: "2026-09", to: "2026-08" })).toThrow();
    expect(() => repo.summaryByCategory({ from: "2025-01", to: "2026-09" })).toThrow();
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

describe("members", () => {
  it("creates members and lists them in order of creation", () => {
    repo.createMember("Ana");
    repo.createMember("Luis");
    expect(repo.listMembers().map((m) => m.name)).toEqual(["Ana", "Luis"]);
  });

  it("trims names and rejects empty or too long ones", () => {
    expect(repo.createMember("  Ana  ").name).toBe("Ana");
    expect(() => repo.createMember("   ")).toThrow();
    expect(() => repo.createMember("x".repeat(31))).toThrow();
  });

  it("does not allow repeated names, ignoring case, even if the other is archived", () => {
    const ana = repo.createMember("Ana");
    expect(() => repo.createMember("ana")).toThrow(/ya existe/i);
    repo.setMemberArchived(ana.id, true);
    expect(() => repo.createMember("ANA")).toThrow(/ya existe/i);
  });

  it("allows at most 5 active members", () => {
    ["A", "B", "C", "D", "E"].forEach((n) => repo.createMember(n));
    expect(() => repo.createMember("F")).toThrow(/5 miembros/);
    expect(repo.listMembers()).toHaveLength(5);
  });

  it("archived members do not count towards the limit, and restoring respects it", () => {
    const members = ["A", "B", "C", "D", "E"].map((n) => repo.createMember(n));
    repo.setMemberArchived(members[0].id, true);

    const f = repo.createMember("F"); // hay hueco porque A está archivado
    expect(f.archived).toBe(false);
    expect(() => repo.setMemberArchived(members[0].id, false)).toThrow(/5 miembros/);

    repo.setMemberArchived(members[1].id, true);
    repo.setMemberArchived(members[0].id, false);
    expect(repo.listMembers().find((m) => m.id === members[0].id)?.archived).toBe(false);
  });

  it("lists active members first and archived ones last", () => {
    const a = repo.createMember("A");
    repo.createMember("B");
    repo.setMemberArchived(a.id, true);
    expect(repo.listMembers().map((m) => m.name)).toEqual(["B", "A"]);
  });

  it("renames a member, but not to a name already taken or for an unknown id", () => {
    const ana = repo.createMember("Ana");
    repo.createMember("Luis");
    repo.renameMember(ana.id, "Anita");
    expect(repo.listMembers().map((m) => m.name)).toEqual(["Anita", "Luis"]);

    expect(() => repo.renameMember(ana.id, "luis")).toThrow(/ya existe/i);
    expect(() => repo.renameMember(999, "Nadie")).toThrow(/no existe/i);
    // Poner su propio nombre (cambiando mayúsculas) sí está permitido.
    expect(() => repo.renameMember(ana.id, "ANITA")).not.toThrow();
  });

  it("rejects an unknown id when archiving", () => {
    expect(() => repo.setMemberArchived(999, true)).toThrow(/no existe/i);
  });
});

describe("transactions and members", () => {
  it("stores who paid and returns it when listing", () => {
    const ana = repo.createMember("Ana");
    const created = repo.createTransaction(input({ memberId: ana.id }));
    expect(created.memberId).toBe(ana.id);
    expect(repo.listTransactions("2026-09")[0].memberId).toBe(ana.id);
  });

  it("allows transactions without a member", () => {
    expect(repo.createTransaction(input()).memberId).toBeNull();
    expect(repo.createTransaction(input({ memberId: undefined as unknown as null })).memberId).toBeNull();
  });

  it("rejects an unknown or archived member without writing anything", () => {
    expect(() => repo.createTransaction(input({ memberId: 999 }))).toThrow(/miembro/i);

    const ana = repo.createMember("Ana");
    repo.setMemberArchived(ana.id, true);
    expect(() => repo.createTransaction(input({ memberId: ana.id }))).toThrow(/miembro/i);
    expect(repo.listTransactions("2026-09")).toEqual([]);
  });

  it("keeps the member of old transactions after archiving them", () => {
    const ana = repo.createMember("Ana");
    repo.createTransaction(input({ memberId: ana.id }));
    repo.setMemberArchived(ana.id, true);
    expect(repo.listTransactions("2026-09")[0].memberId).toBe(ana.id);
  });
});

describe("migration with existing data", () => {
  it("keeps existing transactions and leaves them without a member", () => {
    const old = new Database(":memory:");
    // Se aplican a mano las migraciones anteriores a los miembros, se guardan datos y
    // luego se aplica la migración de miembros, como haría la app al actualizarse.
    const files = readdirSync(migrationsFolder)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const apply = (file: string) => {
      const sql = readFileSync(path.join(migrationsFolder, file), "utf8");
      sql.split("--> statement-breakpoint").forEach((statement) => old.exec(statement));
    };
    const membersMigration = files.find((f) => readFileSync(path.join(migrationsFolder, f), "utf8").includes("CREATE TABLE `members`"));
    expect(membersMigration).toBeDefined();

    files.filter((f) => f < membersMigration!).forEach(apply);
    old
      .prepare("insert into transactions (type, amount, category, description, date) values ('expense', 1250, 'Comida', 'Menú', '2026-09-10')")
      .run();
    apply(membersMigration!);

    const row = old.prepare("select amount, category, member_id from transactions").get() as {
      amount: number;
      category: string;
      member_id: number | null;
    };
    expect(row).toEqual({ amount: 1250, category: "Comida", member_id: null });
    old.close();
  });
});

describe("savings", () => {
  it("stores a saving with the same cents conversion as other types", () => {
    const created = repo.createTransaction(input({ type: "saving", category: "Vacaciones", amount: 150.75 }));
    expect(created).toMatchObject({ type: "saving", amount: 150.75, category: "Vacaciones" });
    const raw = sqlite.prepare("select type, amount from transactions where id = ?").get(created.id);
    expect(raw).toEqual({ type: "saving", amount: 15075 });
  });

  it("appears in the month list next to income and expenses", () => {
    repo.createTransaction(input({ type: "income", category: "Salario" }));
    repo.createTransaction(input({ type: "expense" }));
    repo.createTransaction(input({ type: "saving", category: "Vacaciones" }));
    expect(repo.listTransactions("2026-09").map((t) => t.type).sort()).toEqual(["expense", "income", "saving"]);
  });

  it("is not counted as an expense in the per-category summary", () => {
    repo.createTransaction(input({ type: "saving", category: "Vacaciones", amount: 500 }));
    repo.createTransaction(input({ type: "expense", category: "Comida", amount: 20 }));
    expect(repo.summaryByCategory({ from: "2026-09", to: "2026-09" })).toEqual([
      { month: "2026-09", category: "Comida", amount: 20 },
    ]);
  });

  it("keeps its own categories apart from income and expenses", () => {
    repo.createTransaction(input({ type: "saving", category: "Fondo de emergencia" }));
    repo.createTransaction(input({ type: "expense", category: "Comida" }));
    expect(repo.listCategories("saving")).toEqual(["Fondo de emergencia"]);
    expect(repo.listCategories("expense")).toEqual(["Comida"]);
  });

  it("can be deactivated like any other transaction", () => {
    const saving = repo.createTransaction(input({ type: "saving", category: "Vacaciones" }));
    repo.setTransactionExcluded(saving.id, true);
    expect(repo.listTransactions("2026-09")[0].excluded).toBe(true);
  });

  it("can be assigned to a member", () => {
    const ana = repo.createMember("Ana");
    expect(repo.createTransaction(input({ type: "saving", memberId: ana.id })).memberId).toBe(ana.id);
  });
});

describe("summaryByCategory by type", () => {
  const range = { from: "2026-09", to: "2026-09" };

  beforeEach(() => {
    repo.createTransaction(input({ type: "expense", category: "Comida", amount: 20 }));
    repo.createTransaction(input({ type: "saving", category: "Vacaciones", amount: 300 }));
    repo.createTransaction(input({ type: "saving", category: "Fondo de emergencia", amount: 100, date: "2026-08-15" }));
    repo.createTransaction(input({ type: "income", category: "Salario", amount: 1800 }));
  });

  it("summarizes expenses by default", () => {
    expect(repo.summaryByCategory(range)).toEqual([{ month: "2026-09", category: "Comida", amount: 20 }]);
  });

  it("summarizes savings when asked, grouped by month and category", () => {
    const rows = repo.summaryByCategory({ from: "2026-08", to: "2026-09" }, undefined, "saving");
    const byKey = Object.fromEntries(rows.map((r) => [`${r.month}/${r.category}`, r.amount]));
    expect(byKey).toEqual({ "2026-09/Vacaciones": 300, "2026-08/Fondo de emergencia": 100 });
  });

  it("combines the type with the person filter and ignores deactivated savings", () => {
    const ana = repo.createMember("Ana");
    const mine = repo.createTransaction(input({ type: "saving", category: "Jubilación", amount: 50, memberId: ana.id }));
    expect(repo.summaryByCategory(range, ana.id, "saving")).toEqual([
      { month: "2026-09", category: "Jubilación", amount: 50 },
    ]);
    repo.setTransactionExcluded(mine.id, true);
    expect(repo.summaryByCategory(range, ana.id, "saving")).toEqual([]);
  });

  it("can summarize income too and rejects an unknown type", () => {
    expect(repo.summaryByCategory(range, undefined, "income")).toEqual([
      { month: "2026-09", category: "Salario", amount: 1800 },
    ]);
    expect(() => repo.summaryByCategory(range, undefined, "transfer" as never)).toThrow();
  });
});
