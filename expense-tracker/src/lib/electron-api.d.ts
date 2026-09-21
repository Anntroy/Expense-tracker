import type { MonthRange, TransactionInput } from "./schema";
import type { CategoryMonthTotal, Member, Transaction, TransactionType } from "./types";
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
  members: {
    list: () => Promise<Member[]>;
    create: (name: string) => Promise<Member>;
    rename: (id: number, name: string) => Promise<void>;
    setArchived: (id: number, archived: boolean) => Promise<void>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
