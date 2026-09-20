import type { TransactionInput } from "./schema";
import type { Transaction } from "./types";

export interface ElectronApi {
  transactions: {
    list: () => Promise<Transaction[]>;
    create: (input: TransactionInput) => Promise<Transaction>;
    delete: (id: number) => Promise<void>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
