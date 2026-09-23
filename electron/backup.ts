import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import type Database from "better-sqlite3";
import { backupFileName, inspectBackup, restoreBackup, safetyCopyName } from "./db/backup";
import type { BackupExportResult, BackupImportResult } from "../src/lib/types";

type Deps = {
  sqlite: Database.Database;
  dbPath: string;
  migrationsFolder: string;
  /** Se llama tras reemplazar los datos: migrar si la copia era antigua, bloquear y recargar. */
  afterImport: () => void;
};

const FILTERS = [{ name: "Copia de Expense Tracker", extensions: ["db"] }];

const samePath = (a: string, b: string) => path.resolve(a) === path.resolve(b);

/**
 * Exportar e importar copias de seguridad (un archivo `.db`, para pasar los datos a otro
 * ordenador). Los diálogos de archivo y la confirmación son nativos y se abren desde el
 * proceso principal, así que el renderer nunca elige ni ve rutas arbitrarias: solo pide
 * "exportar" o "importar". La validación y la copia en sí están en `db/backup.ts`, con tests.
 */
export function createBackupActions({ sqlite, dbPath, migrationsFolder, afterImport }: Deps) {
  const parent = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];

  return {
    async exportBackup(): Promise<BackupExportResult> {
      const options = {
        title: "Exportar copia de seguridad",
        defaultPath: path.join(app.getPath("documents"), backupFileName(new Date())),
        filters: FILTERS,
      };
      const win = parent();
      const { canceled, filePath } = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options);
      if (canceled || !filePath) return { status: "cancelled" };
      if (samePath(filePath, dbPath)) throw new Error("Elige otro sitio: ese es el archivo que usa la app.");

      // Copia en caliente con la API de backup de SQLite: no hace falta cerrar la app.
      await sqlite.backup(filePath);
      return { status: "saved", filePath };
    },

    async importBackup(): Promise<BackupImportResult> {
      const options = {
        title: "Importar copia de seguridad",
        properties: ["openFile" as const],
        filters: FILTERS,
      };
      const win = parent();
      const { canceled, filePaths } = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      const source = filePaths[0];
      if (canceled || !source) return { status: "cancelled" };
      if (samePath(source, dbPath)) throw new Error("Ese es el archivo que ya usa la app.");

      const info = inspectBackup(source, migrationsFolder);
      const current = sqlite.prepare("select count(*) from transactions").pluck().get() as number;
      const safetyCopy = path.join(path.dirname(dbPath), safetyCopyName(new Date()));

      const confirmOptions = {
        type: "warning" as const,
        buttons: ["Reemplazar mis datos", "Cancelar"],
        defaultId: 1,
        cancelId: 1,
        message: "¿Reemplazar los datos actuales por los de la copia?",
        detail:
          `La copia tiene ${info.transactions} movimientos y ${info.members} miembros. ` +
          `Sustituirá a los ${current} movimientos que hay ahora en este ordenador, ` +
          `junto con los miembros, la moneda y el PIN.\n\n` +
          `Por si acaso, antes se guarda una copia de los datos actuales en:\n${safetyCopy}`,
      };
      const { response } = win
        ? await dialog.showMessageBox(win, confirmOptions)
        : await dialog.showMessageBox(confirmOptions);
      if (response !== 0) return { status: "cancelled" };

      await sqlite.backup(safetyCopy);
      await restoreBackup(source, dbPath);
      afterImport();
      return { status: "imported", safetyCopy };
    },
  };
}

export type BackupActions = ReturnType<typeof createBackupActions>;
