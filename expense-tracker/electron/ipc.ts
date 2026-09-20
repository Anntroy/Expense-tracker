import { ipcMain } from "electron";
import { createTransaction, deleteTransaction, listTransactions } from "./db/transactions";

export function registerIpcHandlers() {
  ipcMain.handle("transactions:list", () => listTransactions());
  ipcMain.handle("transactions:create", (_event, input) => createTransaction(input));
  ipcMain.handle("transactions:delete", (_event, id: number) => deleteTransaction(id));
}
