import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { backupFileName, inspectBackup, restoreBackup, safetyCopyName } from "./backup";
import { createTransactionsRepository } from "./repository";
import * as schema from "./schema";
import type { TransactionInput } from "../../src/lib/schema";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

// Estos tests necesitan archivos de verdad (la API de backup copia entre archivos), así que
// cada uno usa una carpeta temporal propia; nunca tocan los datos de la app.
let dir: string;
const open: Database.Database[] = [];

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "expense-backup-"));
});

afterEach(() => {
  for (const db of open.splice(0)) db.close();
  rmSync(dir, { recursive: true, force: true });
});

/** Crea una base en `dir` con las migraciones de `folder` aplicadas. */
function createDb(name: string, folder = migrationsFolder) {
  const file = path.join(dir, name);
  const sqlite = new Database(file);
  open.push(sqlite);
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: folder });
  return { file, sqlite, repo: createTransactionsRepository(db) };
}

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

/** Carpeta de migraciones con solo las `count` primeras: simula una versión anterior de la app. */
function olderMigrations(count: number): string {
  const folder = path.join(dir, "old-migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = path.join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  journal.entries = journal.entries.slice(0, count);
  writeFileSync(journalPath, JSON.stringify(journal));
  return folder;
}

describe("inspectBackup", () => {
  it("accepts a copy made by this version and counts what it has", async () => {
    const { sqlite, repo } = createDb("app.db");
    repo.createMember("Ana");
    repo.createTransaction(input());
    repo.createTransaction(input({ amount: 5 }));
    const copy = path.join(dir, "copia.db");
    await sqlite.backup(copy);

    expect(inspectBackup(copy, migrationsFolder)).toEqual({ transactions: 2, members: 1 });
  });

  it("accepts a copy from an older version (before the members table existed)", () => {
    const { file } = createDb("old.db", olderMigrations(2));
    expect(inspectBackup(file, migrationsFolder)).toEqual({ transactions: 0, members: 0 });
  });

  it("rejects a copy from a newer version of the app", () => {
    const { file, sqlite } = createDb("new.db");
    sqlite
      .prepare("insert into __drizzle_migrations (hash, created_at) values ('futura', ?)")
      .run(Date.now() + 1e9);
    expect(() => inspectBackup(file, migrationsFolder)).toThrow(/versión más nueva/);
  });

  it("rejects a file that is not a database", () => {
    const file = path.join(dir, "notas.db");
    writeFileSync(file, "esto no es una base de datos, es texto cualquiera ".repeat(20));
    expect(() => inspectBackup(file, migrationsFolder)).toThrow(/no es una copia/);
  });

  it("rejects a SQLite database from another app", () => {
    const file = path.join(dir, "otra.db");
    const other = new Database(file);
    other.exec("create table cosas (id integer primary key)");
    other.close();
    expect(() => inspectBackup(file, migrationsFolder)).toThrow(/no es una copia/);
  });

  it("rejects a missing file", () => {
    expect(() => inspectBackup(path.join(dir, "no-existe.db"), migrationsFolder)).toThrow(/No se pudo abrir/);
  });
});

describe("restoreBackup", () => {
  it("replaces the data under a connection that is still open, which sees it right away", async () => {
    const current = createDb("app.db");
    current.repo.createTransaction(input({ category: "Vieja" }));

    const other = createDb("otro-ordenador.db");
    other.repo.createMember("Luis");
    other.repo.createTransaction(input({ category: "Traída", amount: 42.5 }));

    await restoreBackup(other.file, current.file);

    const list = current.repo.listTransactions("2026-09");
    expect(list.map((t) => [t.category, t.amount])).toEqual([["Traída", 42.5]]);
    expect(current.repo.listMembers().map((m) => m.name)).toEqual(["Luis"]);
  });

  it("an older copy can be upgraded with the normal migrations after restoring it", async () => {
    const current = createDb("app.db");
    const old = createDb("old.db", olderMigrations(1));
    old.sqlite
      .prepare("insert into transactions (type, amount, category, description, date) values (?, ?, ?, ?, ?)")
      .run("expense", 1250, "Comida", "", "2026-09-10");

    await restoreBackup(old.file, current.file);
    migrate(drizzle(current.sqlite, { schema }), { migrationsFolder });

    const [t] = current.repo.listTransactions("2026-09");
    expect(t).toMatchObject({ category: "Comida", amount: 12.5, excluded: false, memberId: null });
    expect(current.repo.listMembers()).toEqual([]);
  });
});

describe("file names", () => {
  const date = new Date(2026, 8, 3, 7, 5);
  it("export name carries the day", () => {
    expect(backupFileName(date)).toBe("expense-tracker-2026-09-03.db");
  });
  it("safety copy name carries day and time, so several imports don't overwrite each other", () => {
    expect(safetyCopyName(date)).toBe("expense-tracker.before-import-2026-09-03-0705.db");
  });
});
