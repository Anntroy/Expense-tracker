import { beforeEach, describe, expect, it } from "vitest";
import { createAuth, type AuthStore } from "./auth";

function memoryStore(): AuthStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

let store: ReturnType<typeof memoryStore>;
let time: number;
const newAuth = () => createAuth({ store, now: () => time });

beforeEach(() => {
  store = memoryStore();
  time = 1_000_000;
});

describe("without a PIN", () => {
  it("starts unlocked and never blocks", () => {
    const auth = newAuth();
    expect(auth.status()).toEqual({ hasPin: false, unlocked: true });
    expect(() => auth.assertUnlocked()).not.toThrow();
    auth.lock(); // sin PIN no habría cómo desbloquear: no hace nada
    expect(auth.status().unlocked).toBe(true);
  });
});

describe("setting a PIN", () => {
  it("stores only a salted hash, never the PIN itself", () => {
    const auth = newAuth();
    auth.setPin("1234");
    const saved = store.data.get("pin")!;
    expect(saved).not.toContain("1234");
    expect(saved).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("uses a different salt every time", () => {
    const auth = newAuth();
    auth.setPin("1234");
    const first = store.data.get("pin")!.split(":")[0];
    auth.setPin("1234", "1234");
    expect(store.data.get("pin")!.split(":")[0]).not.toBe(first);
  });

  it("leaves the app unlocked for the current session", () => {
    const auth = newAuth();
    auth.setPin("1234");
    expect(auth.status()).toEqual({ hasPin: true, unlocked: true });
  });

  it("rejects PINs that are not 4 to 8 digits", () => {
    const auth = newAuth();
    for (const bad of ["123", "123456789", "12a4", "", "12 34"]) {
      expect(() => auth.setPin(bad)).toThrow(/entre 4 y 8 dígitos/);
    }
    expect(auth.status().hasPin).toBe(false);
  });

  it("changing an existing PIN requires the current one", () => {
    const auth = newAuth();
    auth.setPin("1234");
    expect(() => auth.setPin("5678")).toThrow(/incorrecto/i);
    expect(() => auth.setPin("5678", "0000")).toThrow(/incorrecto/i);
    auth.setPin("5678", "1234");

    auth.lock();
    expect(auth.unlock("1234").ok).toBe(false);
    expect(auth.unlock("5678").ok).toBe(true);
  });
});

describe("locking and unlocking", () => {
  it("starts locked when a PIN already exists (a new session of the app)", () => {
    newAuth().setPin("1234");
    const restarted = newAuth();
    expect(restarted.status()).toEqual({ hasPin: true, unlocked: false });
    expect(() => restarted.assertUnlocked()).toThrow(/bloqueada/);
  });

  it("unlocks with the right PIN and locks again on demand", () => {
    const auth = newAuth();
    auth.setPin("1234");
    auth.lock();
    expect(() => auth.assertUnlocked()).toThrow();

    expect(auth.unlock("1234")).toEqual({ ok: true });
    expect(() => auth.assertUnlocked()).not.toThrow();

    auth.lock();
    expect(auth.status().unlocked).toBe(false);
  });

  it("a wrong PIN stays locked and reports the attempts left", () => {
    const auth = newAuth();
    auth.setPin("1234");
    auth.lock();
    expect(auth.unlock("0000")).toEqual({ ok: false, reason: "wrong", retryAfterMs: 0, attemptsLeft: 4 });
    expect(auth.unlock("1111")).toMatchObject({ reason: "wrong", attemptsLeft: 3 });
    expect(auth.status().unlocked).toBe(false);
  });

  it("does not crash on a non-string PIN", () => {
    const auth = newAuth();
    auth.setPin("1234");
    auth.lock();
    expect(auth.unlock(undefined as unknown as string).ok).toBe(false);
    expect(auth.unlock(1234 as unknown as string).ok).toBe(false);
  });
});

describe("brute-force protection", () => {
  function lockedAuth() {
    const auth = newAuth();
    auth.setPin("1234");
    auth.lock();
    return auth;
  }
  const failTimes = (auth: ReturnType<typeof newAuth>, n: number) => {
    let last;
    for (let i = 0; i < n; i++) last = auth.unlock("0000");
    return last;
  };

  it("after 5 failures it makes you wait 30 seconds, even with the right PIN", () => {
    const auth = lockedAuth();
    expect(failTimes(auth, 5)).toEqual({ ok: false, reason: "locked-out", retryAfterMs: 30_000, attemptsLeft: 0 });

    time += 10_000;
    expect(auth.unlock("1234")).toMatchObject({ ok: false, reason: "locked-out", retryAfterMs: 20_000 });
    expect(auth.status().unlocked).toBe(false);

    time += 20_000; // ya pasaron los 30 s
    expect(auth.unlock("1234")).toEqual({ ok: true });
  });

  it("the wait doubles with every further block of 5 failures", () => {
    const auth = lockedAuth();
    failTimes(auth, 5);
    time += 30_000;
    expect(failTimes(auth, 5)).toMatchObject({ reason: "locked-out", retryAfterMs: 60_000 });
    time += 60_000;
    expect(failTimes(auth, 5)).toMatchObject({ reason: "locked-out", retryAfterMs: 120_000 });
  });

  it("the wait is capped at 30 minutes", () => {
    const auth = lockedAuth();
    let last;
    for (let block = 0; block < 12; block++) {
      last = failTimes(auth, 5);
      time += 60 * 60_000;
    }
    expect(last).toMatchObject({ reason: "locked-out", retryAfterMs: 30 * 60_000 });
  });

  it("a successful unlock resets the failure counter", () => {
    const auth = lockedAuth();
    failTimes(auth, 4);
    expect(auth.unlock("1234").ok).toBe(true);
    auth.lock();
    expect(auth.unlock("0000")).toMatchObject({ reason: "wrong", attemptsLeft: 4 });
  });

  it("wrong current PINs when changing or removing also count", () => {
    const auth = newAuth();
    auth.setPin("1234");
    for (let i = 0; i < 4; i++) expect(() => auth.setPin("5678", "0000")).toThrow(/incorrecto/i);
    expect(() => auth.removePin("0000")).toThrow(/Demasiados intentos/);
    expect(() => auth.setPin("5678", "1234")).toThrow(/Demasiados intentos/);
  });
});

describe("removing the PIN", () => {
  it("requires the current PIN", () => {
    const auth = newAuth();
    auth.setPin("1234");
    expect(() => auth.removePin("0000")).toThrow(/incorrecto/i);
    expect(auth.status().hasPin).toBe(true);

    auth.removePin("1234");
    expect(auth.status()).toEqual({ hasPin: false, unlocked: true });
    expect(store.data.has("pin")).toBe(false);
    expect(newAuth().status()).toEqual({ hasPin: false, unlocked: true });
  });

  it("cannot be done while the app is locked", () => {
    const auth = newAuth();
    auth.setPin("1234");
    auth.lock();
    expect(() => auth.removePin("1234")).toThrow(/bloqueada/);
    expect(() => auth.setPin("5678", "1234")).toThrow(/bloqueada/);
    expect(auth.status().hasPin).toBe(true);
  });

  it("does nothing if there was no PIN", () => {
    expect(() => newAuth().removePin("1234")).not.toThrow();
  });
});
