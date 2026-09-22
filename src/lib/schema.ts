import { z } from "zod";
import { monthCount } from "./date";
import { CURRENCIES, TRANSACTION_TYPES } from "./types";

export const TransactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z
    .number({ error: "La cantidad debe ser un número." })
    .positive({ error: "La cantidad debe ser mayor a 0." }),
  category: z
    .string()
    .trim()
    .min(1, { error: "Elegí o escribí una categoría." }),
  description: z.string().max(200).optional().default(""),
  date: z.string().min(1, { error: "Elegí una fecha." }),
  /** Quién pagó / cobró; `null` = sin asignar. */
  memberId: z.number().int().positive().nullable().optional().default(null),
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const SetExcludedSchema = z.object({
  id: z.number().int().positive(),
  excluded: z.boolean(),
});

export const MAX_COMPARISON_MONTHS = 12;

const MonthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Mes inválido." });

/** Intervalo de meses seguidos para la comparación: `from` <= `to` y como mucho 12 meses. */
export const MonthRangeSchema = z
  .object({ from: MonthKeySchema, to: MonthKeySchema })
  .refine(({ from, to }) => from <= to, { error: "El mes inicial no puede ser posterior al final." })
  .refine(({ from, to }) => monthCount(from, to) <= MAX_COMPARISON_MONTHS, {
    error: `Elegí como máximo ${MAX_COMPARISON_MONTHS} meses.`,
  });

export type MonthRange = z.infer<typeof MonthRangeSchema>;

export const MAX_MEMBERS = 5;

export const MemberIdSchema = z.number().int().positive();

export const MemberNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Escribí un nombre." })
  .max(30, { error: "Máximo 30 caracteres." });

/**
 * Filtro por persona en las consultas: omitido = todas las personas, `null` = solo
 * los movimientos sin asignar, un número = solo los de ese miembro.
 */
export const MemberFilterSchema = MemberIdSchema.nullable().optional();

/** PIN de bloqueo: solo dígitos, entre 4 y 8. */
export const PinSchema = z.string().regex(/^\d{4,8}$/, { error: "El PIN debe tener entre 4 y 8 dígitos." });

export const CurrencySchema = z.enum(CURRENCIES);

export const TransactionTypeSchema = z.enum(TRANSACTION_TYPES);
