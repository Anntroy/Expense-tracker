import type { MonthRange, TransactionInput } from "./schema";
import type {
  AuthStatus,
  BackupExportResult,
  BackupImportResult,
  CategoryMonthTotal,
  Currency,
  Member,
  Transaction,
  TransactionType,
  UnlockResult,
} from "./types";
import type { MonthKey } from "./date";

export interface ElectronApi {
  transactions: {
    list: (month: MonthKey) => Promise<Transaction[]>;
    create: (input: TransactionInput) => Promise<Transaction>;
    delete: (id: number) => Promise<void>;
    setExcluded: (id: number, excluded: boolean) => Promise<void>;
    summary: (
      range: MonthRange,
      memberId?: number | null,
      type?: TransactionType,
    ) => Promise<CategoryMonthTotal[]>;
    categories: (type: TransactionType) => Promise<string[]>;
  };
  auth: {
    status: () => Promise<AuthStatus>;
    unlock: (pin: string) => Promise<UnlockResult>;
    lock: () => Promise<void>;
    setPin: (newPin: string, currentPin?: string) => Promise<void>;
    removePin: (currentPin: string) => Promise<void>;
  };
  settings: {
    getCurrency: () => Promise<Currency>;
    setCurrency: (currency: Currency) => Promise<void>;
  };
  members: {
    list: () => Promise<Member[]>;
    create: (name: string) => Promise<Member>;
    rename: (id: number, name: string) => Promise<void>;
    setArchived: (id: number, archived: boolean) => Promise<void>;
  };
  /** Copias de seguridad: los diálogos de archivo los abre el proceso principal. */
  backup: {
    export: () => Promise<BackupExportResult>;
    import: () => Promise<BackupImportResult>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
