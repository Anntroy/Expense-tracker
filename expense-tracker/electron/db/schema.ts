import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: integer().primaryKey({ autoIncrement: true }),
  type: text({ enum: ["income", "expense"] }).notNull(),
  // Guardado en centavos (ej. 12,50 € -> 1250) para evitar errores de
  // redondeo de punto flotante. La conversión a/desde decimal se hace
  // en la capa que consume esta tabla, no acá.
  amount: integer().notNull(),
  category: text().notNull(),
  description: text().notNull().default(""),
  date: text().notNull(),
});
