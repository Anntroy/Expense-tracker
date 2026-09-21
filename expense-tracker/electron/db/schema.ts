import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Miembros del hogar: solo etiquetas ("quién pagó / quién cobró"), no cuentas.
// Un miembro que se quita se archiva, para que los movimientos antiguos
// conserven su nombre.
export const members = sqliteTable("members", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  archived: integer({ mode: "boolean" }).notNull().default(false),
});

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
  // Un movimiento desactivado se conserva pero no cuenta en los totales ni en
  // los gráficos.
  excluded: integer({ mode: "boolean" }).notNull().default(false),
  // Quién pagó / cobró. Nulo = sin asignar (p. ej. los movimientos anteriores a los miembros).
  memberId: integer("member_id").references(() => members.id),
});
