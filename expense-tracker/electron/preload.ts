import { contextBridge, ipcRenderer } from "electron";
import type { CategoryMonthTotal, Transaction, TransactionType } from "../src/lib/types";
import type { MonthRange, TransactionInput } from "../src/lib/schema";
import type { MonthKey } from "../src/lib/date";

contextBridge.exposeInMainWorld("api", {
  transactions: {
    list: (month: MonthKey): Promise<Transaction[]> =>
      ipcRenderer.invoke("transactions:list", month),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke("transactions:create", input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke("transactions:delete", id),
    setExcluded: (id: number, excluded: boolean): Promise<void> =>
      ipcRenderer.invoke("transactions:setExcluded", id, excluded),
    summary: (range: MonthRange): Promise<CategoryMonthTotal[]> =>
      ipcRenderer.invoke("transactions:summary", range),
    categories: (type: TransactionType): Promise<string[]> =>
      ipcRenderer.invoke("transactions:categories", type),
  },
});
