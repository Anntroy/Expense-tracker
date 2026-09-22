import { eq } from "drizzle-orm";
import { settings } from "./schema";
import type { Db } from "./repository";
import { CurrencySchema } from "../../src/lib/schema";
import type { Currency } from "../../src/lib/types";

const DEFAULT_CURRENCY: Currency = "EUR";

/** Ajustes clave/valor de la app. Recibe la base como parámetro, igual que el repositorio de movimientos. */
export function createSettingsRepository(db: Db) {
  return {
    get(key: string): string | null {
      const row = db.select().from(settings).where(eq(settings.key, key)).get();
      return row ? row.value : null;
    },

    set(key: string, value: string): void {
      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    },

    remove(key: string): void {
      db.delete(settings).where(eq(settings.key, key)).run();
    },

    /** Moneda de la app; si no hay ninguna guardada (o el valor no es válido) se usa EUR. */
    getCurrency(): Currency {
      const parsed = CurrencySchema.safeParse(this.get("currency"));
      return parsed.success ? parsed.data : DEFAULT_CURRENCY;
    },

    setCurrency(currency: Currency): void {
      this.set("currency", CurrencySchema.parse(currency));
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
