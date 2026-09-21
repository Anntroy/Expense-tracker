import { ipcMain } from "electron";
import {
  createTransaction,
  deleteTransaction,
  listCategories,
  listTransactions,
  setTransactionExcluded,
} from "./db/transactions";
import type { MonthKey } from "../src/lib/date";
import type { TransactionType } from "../src/lib/types";

export function registerIpcHandlers() {
  ipcMain.handle("transactions:list", (_event, month: MonthKey) => listTransactions(month));
  ipcMain.handle("transactions:create", (_event, input) => createTransaction(input));
  ipcMain.handle("transactions:delete", (_event, id: number) => deleteTransaction(id));
  ipcMain.handle("transactions:setExcluded", (_event, id: number, excluded: boolean) =>
    setTransactionExcluded(id, excluded),
  );
  ipcMain.handle("transactions:categories", (_event, type: TransactionType) => listCategories(type));
}
