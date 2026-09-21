import { db } from "./client";
import { createTransactionsRepository } from "./repository";

// La lógica vive en `repository.ts` (testeable sin Electron); acá se enlaza
// con la base real de la app.
export const {
  listTransactions,
  createTransaction,
  deleteTransaction,
  setTransactionExcluded,
  summaryByCategory,
  listCategories,
  listMembers,
  createMember,
  renameMember,
  setMemberArchived,
} = createTransactionsRepository(db);
