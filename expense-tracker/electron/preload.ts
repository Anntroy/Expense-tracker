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
import type { ElectronApi } from "../src/lib/electron-api";

// `satisfies` hace que TypeScript compruebe que esta API coincide con `ElectronApi`, el tipo
// que usa la interfaz: si se añade, quita o cambia un método en un sitio y no en el otro, no compila.
const api = {
  transactions: {
    list: (month: MonthKey): Promise<Transaction[]> =>
      ipcRenderer.invoke("transactions:list", month),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke("transactions:create", input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke("transactions:delete", id),
    setExcluded: (id: number, excluded: boolean): Promise<void> =>
      ipcRenderer.invoke("transactions:setExcluded", id, excluded),
    summary: (
      range: MonthRange,
      memberId?: number | null,
      type?: TransactionType,
    ): Promise<CategoryMonthTotal[]> => ipcRenderer.invoke("transactions:summary", range, memberId, type),
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
} satisfies ElectronApi;

contextBridge.exposeInMainWorld("api", api);
