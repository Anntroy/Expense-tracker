import type { MonthRange, TransactionInput } from "./schema";
import type { CategoryMonthTotal, Transaction, TransactionType } from "./types";
import type { MonthKey } from "./date";

export interface ElectronApi {
  transactions: {
    list: (month: MonthKey) => Promise<Transaction[]>;
    create: (input: TransactionInput) => Promise<Transaction>;
    delete: (id: number) => Promise<void>;
    setExcluded: (id: number, excluded: boolean) => Promise<void>;
    summary: (range: MonthRange) => Promise<CategoryMonthTotal[]>;
    categories: (type: TransactionType) => Promise<string[]>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
