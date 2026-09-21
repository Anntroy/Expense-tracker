import { contextBridge, ipcRenderer } from "electron";
import type {
  AuthStatus,
  CategoryMonthTotal,
  Currency,
  Member,
  Transaction,
  TransactionType,
  UnlockResult,
} from "../src/lib/types";
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
    summary: (range: MonthRange, memberId?: number | null): Promise<CategoryMonthTotal[]> =>
      ipcRenderer.invoke("transactions:summary", range, memberId),
    categories: (type: TransactionType): Promise<string[]> =>
      ipcRenderer.invoke("transactions:categories", type),
  },
  auth: {
    status: (): Promise<AuthStatus> => ipcRenderer.invoke("auth:status"),
    unlock: (pin: string): Promise<UnlockResult> => ipcRenderer.invoke("auth:unlock", pin),
    lock: (): Promise<void> => ipcRenderer.invoke("auth:lock"),
    setPin: (newPin: string, currentPin?: string): Promise<void> =>
      ipcRenderer.invoke("auth:setPin", newPin, currentPin),
    removePin: (currentPin: string): Promise<void> => ipcRenderer.invoke("auth:removePin", currentPin),
  },
  settings: {
    getCurrency: (): Promise<Currency> => ipcRenderer.invoke("settings:getCurrency"),
    setCurrency: (currency: Currency): Promise<void> => ipcRenderer.invoke("settings:setCurrency", currency),
  },
  members: {
    list: (): Promise<Member[]> => ipcRenderer.invoke("members:list"),
    create: (name: string): Promise<Member> => ipcRenderer.invoke("members:create", name),
    rename: (id: number, name: string): Promise<void> =>
      ipcRenderer.invoke("members:rename", id, name),
    setArchived: (id: number, archived: boolean): Promise<void> =>
      ipcRenderer.invoke("members:setArchived", id, archived),
  },
});
