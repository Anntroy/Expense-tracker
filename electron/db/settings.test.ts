import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSettingsRepository } from "./settings";
import * as schema from "./schema";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

let sqlite: Database.Database;
let settings: ReturnType<typeof createSettingsRepository>;

beforeEach(() => {
  sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  settings = createSettingsRepository(db);
});

afterEach(() => sqlite.close());

describe("settings", () => {
  it("returns null for a key that was never saved", () => {
    expect(settings.get("nada")).toBeNull();
  });

  it("saves, overwrites and removes values", () => {
    settings.set("clave", "uno");
    expect(settings.get("clave")).toBe("uno");
    settings.set("clave", "dos");
    expect(settings.get("clave")).toBe("dos");
    settings.remove("clave");
    expect(settings.get("clave")).toBeNull();
  });

  it("keeps a single row per key when overwriting", () => {
    settings.set("clave", "uno");
    settings.set("clave", "dos");
    const { n } = sqlite.prepare("select count(*) as n from settings").get() as { n: number };
    expect(n).toBe(1);
  });

  it("does nothing when removing a missing key", () => {
    expect(() => settings.remove("nada")).not.toThrow();
  });
});

describe("currency", () => {
  it("defaults to EUR", () => {
    expect(settings.getCurrency()).toBe("EUR");
  });

  it("saves and returns the chosen currency", () => {
    settings.setCurrency("USD");
    expect(settings.getCurrency()).toBe("USD");
  });

  it("falls back to EUR if the stored value is not a valid currency", () => {
    settings.set("currency", "XYZ");
    expect(settings.getCurrency()).toBe("EUR");
  });

  it("rejects an invalid currency without saving it", () => {
    expect(() => settings.setCurrency("XYZ" as never)).toThrow();
    expect(settings.get("currency")).toBeNull();
  });
});
