import Database from "better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";

/** Lo que se le cuenta al usuario de una copia antes de importarla. */
export type BackupInfo = { transactions: number; members: number };

const pad = (n: number) => String(n).padStart(2, "0");
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Nombre propuesto al exportar: `expense-tracker-2026-09-23.db`. */
export function backupFileName(now: Date): string {
  return `expense-tracker-${day(now)}.db`;
}

/** Copia de los datos actuales que se guarda antes de importar: `expense-tracker.before-import-2026-09-23-1530.db`. */
export function safetyCopyName(now: Date): string {
  return `expense-tracker.before-import-${day(now)}-${pad(now.getHours())}${pad(now.getMinutes())}.db`;
}

/**
 * Comprueba que `filePath` es una copia de esta app que esta versión sabe abrir, sin
 * modificarla. Lanza un `Error` con un mensaje para mostrar si no lo es.
 *
 * Una copia de una versión más antigua se acepta (las migraciones pendientes se aplican
 * al importarla); una de una versión más nueva no, porque tendría un esquema que este
 * código no conoce. Se compara por `created_at` (la fecha de cada migración en el
 * journal), que es lo que usa el propio `migrate()` de Drizzle, y no por el hash del
 * `.sql`: el hash cambia si Git convierte los finales de línea (p. ej. en Windows).
 */
export function inspectBackup(filePath: string, migrationsFolder: string): BackupInfo {
  let source: Database.Database;
  try {
    source = new Database(filePath, { readonly: true, fileMustExist: true });
  } catch {
    throw new Error("No se pudo abrir el archivo.");
  }

  try {
    let integrity: unknown;
    try {
      integrity = source.pragma("quick_check", { simple: true });
    } catch {
      throw new Error("El archivo no es una copia de seguridad de Expense Tracker.");
    }
    if (integrity !== "ok") throw new Error("El archivo de la copia está dañado.");

    const tables = new Set(
      source
        .prepare("select name from sqlite_master where type = 'table'")
        .pluck()
        .all() as string[],
    );
    if (!tables.has("__drizzle_migrations") || !tables.has("transactions")) {
      throw new Error("El archivo no es una copia de seguridad de Expense Tracker.");
    }

    const known = new Set(readMigrationFiles({ migrationsFolder }).map((m) => m.folderMillis));
    const applied = source
      .prepare("select created_at from __drizzle_migrations")
      .pluck()
      .all()
      .map(Number);
    if (applied.some((millis) => !known.has(millis))) {
      throw new Error(
        "La copia es de una versión más nueva de la app. Actualiza la app en este ordenador y vuelve a intentarlo.",
      );
    }

    const count = (table: string) =>
      tables.has(table) ? (source.prepare(`select count(*) from ${table}`).pluck().get() as number) : 0;
    return { transactions: count("transactions"), members: count("members") };
  } finally {
    source.close();
  }
}

/**
 * Copia el contenido de `sourcePath` sobre la base de `destinationPath` con la API de
 * backup de SQLite. Funciona aunque la app tenga `destinationPath` abierta: SQLite
 * coordina el acceso y la conexión abierta ve los datos nuevos, sin reiniciar la app.
 */
export async function restoreBackup(sourcePath: string, destinationPath: string): Promise<void> {
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    await source.backup(destinationPath);
  } finally {
    source.close();
  }
}
