import { z } from "zod";

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
