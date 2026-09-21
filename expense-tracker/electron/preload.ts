import { contextBridge, ipcRenderer } from "electron";
import type { Transaction, TransactionType } from "../src/lib/types";
import type { TransactionInput } from "../src/lib/schema";
import type { MonthKey } from "../src/lib/date";

contextBridge.exposeInMainWorld("api", {
  transactions: {
    list: (month: MonthKey): Promise<Transaction[]> =>
      ipcRenderer.invoke("transactions:list", month),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke("transactions:create", input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke("transactions:delete", id),
    categories: (type: TransactionType): Promise<string[]> =>
      ipcRenderer.invoke("transactions:categories", type),
  },
});
