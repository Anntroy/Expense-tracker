import { ipcMain } from "electron";
import type { Auth } from "./auth";
import type { BackupActions } from "./backup";
import type { SettingsRepository } from "./db/settings";
import {
  createTransaction,
  deleteTransaction,
  createMember,
  listCategories,
  listMembers,
  listTransactions,
  renameMember,
  setMemberArchived,
  setTransactionExcluded,
  summaryByCategory,
} from "./db/transactions";
import type { Currency } from "../src/lib/types";

type Deps = {
  auth: Auth;
  settings: SettingsRepository;
  backup: BackupActions;
};

/**
 * Registra todos los canales IPC. Los de datos pasan por `guarded`: si la app
 * está bloqueada con PIN, se rechazan en el proceso principal (no basta con que
 * la interfaz muestre la pantalla de bloqueo). Los canales `auth:*` son los únicos
 * que funcionan estando bloqueada.
 */
export function registerIpcHandlers({ auth, settings, backup }: Deps) {
  const guarded =
    <A extends unknown[], R>(fn: (...args: A) => R) =>
    (_event: unknown, ...args: A): R => {
      auth.assertUnlocked();
      return fn(...args);
    };

  // --- Bloqueo con PIN (sin guardia)
  ipcMain.handle("auth:status", () => auth.status());
  ipcMain.handle("auth:unlock", (_event, pin: string) => auth.unlock(pin));
  ipcMain.handle("auth:lock", () => auth.lock());
  ipcMain.handle("auth:setPin", (_event, newPin: string, currentPin?: string) =>
    auth.setPin(newPin, currentPin),
  );
  ipcMain.handle("auth:removePin", (_event, currentPin: string) => auth.removePin(currentPin));

  // --- Datos (con guardia)
  ipcMain.handle("transactions:list", guarded(listTransactions));
  ipcMain.handle("transactions:create", guarded(createTransaction));
  ipcMain.handle("transactions:delete", guarded(deleteTransaction));
  ipcMain.handle("transactions:setExcluded", guarded(setTransactionExcluded));
  ipcMain.handle("transactions:summary", guarded(summaryByCategory));
  ipcMain.handle("transactions:categories", guarded(listCategories));
  ipcMain.handle("members:list", guarded(listMembers));
  ipcMain.handle("members:create", guarded(createMember));
  ipcMain.handle("members:rename", guarded(renameMember));
  ipcMain.handle("members:setArchived", guarded(setMemberArchived));
  ipcMain.handle("settings:getCurrency", guarded(() => settings.getCurrency()));
  ipcMain.handle("settings:setCurrency", guarded((currency: Currency) => settings.setCurrency(currency)));
  ipcMain.handle("backup:export", guarded(() => backup.exportBackup()));
  ipcMain.handle("backup:import", guarded(() => backup.importBackup()));
}
