import { z } from "zod";
import { monthCount } from "./date";

export const TransactionInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ error: "La cantidad debe ser un número." })
    .positive({ error: "La cantidad debe ser mayor a 0." }),
  category: z
    .string()
    .trim()
    .min(1, { error: "Elegí o escribí una categoría." }),
  description: z.string().max(200).optional().default(""),
  date: z.string().min(1, { error: "Elegí una fecha." }),
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
