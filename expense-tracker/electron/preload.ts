import { contextBridge, ipcRenderer } from "electron";
import type { Transaction } from "../src/lib/types";
import type { TransactionInput } from "../src/lib/schema";

contextBridge.exposeInMainWorld("api", {
  transactions: {
    list: (): Promise<Transaction[]> => ipcRenderer.invoke("transactions:list"),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke("transactions:create", input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke("transactions:delete", id),
  },
});
