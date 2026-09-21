import type { TransactionInput } from "./schema";
import type { Transaction, TransactionType } from "./types";
import type { MonthKey } from "./date";

export interface ElectronApi {
  transactions: {
    list: (month: MonthKey) => Promise<Transaction[]>;
    create: (input: TransactionInput) => Promise<Transaction>;
    delete: (id: number) => Promise<void>;
    categories: (type: TransactionType) => Promise<string[]>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
