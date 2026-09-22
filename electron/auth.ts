import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PinSchema } from "../src/lib/schema";
import type { AuthStatus, UnlockResult } from "../src/lib/types";

/** Donde se guarda el PIN (en la app, la tabla de ajustes). */
export interface AuthStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const PIN_KEY = "pin";
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 30 * 60_000;
const KEY_LENGTH = 64;

/** Espera tras `failures` fallos seguidos: 30 s a los 5, 60 s a los 10, 2 min a los 15... con tope de 30 min. */
function lockoutMs(failures: number): number {
  return Math.min(BASE_LOCKOUT_MS * 2 ** (failures / MAX_ATTEMPTS - 1), MAX_LOCKOUT_MS);
}

function hashPin(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, KEY_LENGTH);
}

function describeFailure(result: Extract<UnlockResult, { ok: false }>): string {
  if (result.reason === "locked-out") {
    return `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(result.retryAfterMs / 1000)} s.`;
  }
  return "PIN incorrecto.";
}

/**
 * Bloqueo opcional con PIN. Es lo que hace cumplir el bloqueo en el proceso
 * principal: mientras `assertUnlocked()` falle, los canales de datos rechazan
 * las peticiones aunque el renderer se salte la pantalla de bloqueo.
 *
 * Solo se guarda un hash con sal (scrypt), nunca el PIN. Los fallos seguidos
 * activan una espera creciente (en memoria: se reinicia al cerrar la app). No
 * cifra la base de datos: protege la app, no el archivo.
 */
export function createAuth({ store, now = Date.now }: { store: AuthStore; now?: () => number }) {
  const hasPin = () => store.get(PIN_KEY) !== null;

  let unlocked = !hasPin(); // con PIN, la app arranca bloqueada
  let failures = 0;
  let lockedUntil = 0;

  function matches(pin: string): boolean {
    const stored = store.get(PIN_KEY);
    if (stored === null || typeof pin !== "string") return false;
    const [saltHex, hashHex] = stored.split(":");
    const expected = Buffer.from(hashHex, "hex");
    const actual = hashPin(pin, Buffer.from(saltHex, "hex"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /** Comprueba un PIN aplicando el límite de intentos. */
  function verify(pin: string): UnlockResult {
    const t = now();
    if (t < lockedUntil) {
      return { ok: false, reason: "locked-out", retryAfterMs: lockedUntil - t, attemptsLeft: 0 };
    }
    if (matches(pin)) {
      failures = 0;
      lockedUntil = 0;
      return { ok: true };
    }
    failures += 1;
    if (failures % MAX_ATTEMPTS === 0) {
      lockedUntil = t + lockoutMs(failures);
      return { ok: false, reason: "locked-out", retryAfterMs: lockedUntil - t, attemptsLeft: 0 };
    }
    return { ok: false, reason: "wrong", retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS - (failures % MAX_ATTEMPTS) };
  }

  function assertUnlocked(): void {
    if (!unlocked) throw new Error("La app está bloqueada.");
  }

  function savePin(pin: string): void {
    const salt = randomBytes(16);
    store.set(PIN_KEY, `${salt.toString("hex")}:${hashPin(pin, salt).toString("hex")}`);
  }

  return {
    status(): AuthStatus {
      return { hasPin: hasPin(), unlocked };
    },

    assertUnlocked,

    unlock(pin: string): UnlockResult {
      if (!hasPin()) {
        unlocked = true;
        return { ok: true };
      }
      const result = verify(pin);
      if (result.ok) unlocked = true;
      return result;
    },

    /** Bloquea la app (no hace nada si no hay PIN: no habría cómo desbloquearla). */
    lock(): void {
      if (hasPin()) unlocked = false;
    },

    /** Activa el PIN, o lo cambia si ya había uno (entonces exige el actual). */
    setPin(newPin: string, currentPin?: string): void {
      assertUnlocked();
      const parsed = PinSchema.parse(newPin);
      if (hasPin()) {
        const check = verify(currentPin ?? "");
        if (!check.ok) throw new Error(describeFailure(check));
      }
      savePin(parsed);
      unlocked = true;
    },

    /** Quita el PIN; exige el actual. */
    removePin(currentPin: string): void {
      assertUnlocked();
      if (!hasPin()) return;
      const check = verify(currentPin);
      if (!check.ok) throw new Error(describeFailure(check));
      store.remove(PIN_KEY);
      unlocked = true;
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
