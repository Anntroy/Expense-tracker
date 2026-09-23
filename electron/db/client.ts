import { app } from "electron";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const dbPath = path.join(app.getPath("userData"), "expense-tracker.db");
// La conexión de bajo nivel se exporta para las copias de seguridad (ver electron/backup.ts).
export const sqlite = new Database(dbPath);

// Las migraciones .sql se copian junto al JS compilado (ver build:electron en
// package.json), así que quedan al lado de este archivo tanto en dev como una
// vez empaquetada la app.
export const migrationsFolder = path.join(__dirname, "migrations");

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder });
}
