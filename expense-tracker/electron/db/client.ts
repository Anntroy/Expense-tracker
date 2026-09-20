import { app } from "electron";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const dbPath = path.join(app.getPath("userData"), "expense-tracker.db");
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  // Las migraciones .sql se copian junto al JS compilado (ver
  // build:electron en package.json), así que quedan al lado de este
  // archivo tanto en dev como una vez empaquetada la app.
  migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
}
