import { beforeEach, describe, expect, it, vi } from "vitest";

// `ipc.ts` importa `electron` y la capa de datos real (que abre la base en la carpeta de
// usuario de Electron): se sustituyen para poder probar solo qué canales exigen el desbloqueo.
const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    },
  },
}));

vi.mock("./db/transactions", () => ({
  listTransactions: vi.fn(() => ["movimientos"]),
  createTransaction: vi.fn(() => "creado"),
  deleteTransaction: vi.fn(),
  setTransactionExcluded: vi.fn(),
  summaryByCategory: vi.fn(() => ["resumen"]),
  listCategories: vi.fn(() => ["Comida"]),
  listMembers: vi.fn(() => ["Ana"]),
  createMember: vi.fn(),
  renameMember: vi.fn(),
  setMemberArchived: vi.fn(),
}));

import { createAuth, type AuthStore } from "./auth";
import type { SettingsRepository } from "./db/settings";
import { registerIpcHandlers } from "./ipc";
import * as data from "./db/transactions";

// Los únicos canales que deben funcionar con la app bloqueada.
const OPEN_CHANNELS = ["auth:status", "auth:unlock", "auth:lock", "auth:setPin", "auth:removePin"];

function memoryStore(): AuthStore {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

const fakeSettings = {
  getCurrency: vi.fn(() => "USD"),
  setCurrency: vi.fn(),
} as unknown as SettingsRepository;

function setup() {
  handlers.clear();
  const auth = createAuth({ store: memoryStore() });
  registerIpcHandlers({ auth, settings: fakeSettings });
  return auth;
}

const call = (channel: string, ...args: unknown[]) => {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`Canal sin registrar: ${channel}`);
  return handler({}, ...args);
};

beforeEach(() => vi.clearAllMocks());

describe("IPC channels while the app is locked", () => {
  it("every data channel is rejected in the main process", () => {
    const auth = setup();
    auth.setPin("1234");
    auth.lock();

    const dataChannels = [...handlers.keys()].filter((c) => !OPEN_CHANNELS.includes(c));
    expect(dataChannels.length).toBeGreaterThanOrEqual(12); // por si se pierde algún registro

    for (const channel of dataChannels) {
      expect(() => call(channel), channel).toThrow(/bloqueada/);
    }
    // ...y nada llegó a tocar los datos.
    expect(data.listTransactions).not.toHaveBeenCalled();
    expect(data.createTransaction).not.toHaveBeenCalled();
    expect(fakeSettings.getCurrency).not.toHaveBeenCalled();
  });

  it("the auth channels do work while locked", () => {
    const auth = setup();
    auth.setPin("1234");
    auth.lock();

    expect(call("auth:status")).toEqual({ hasPin: true, unlocked: false });
    expect(call("auth:unlock", "0000")).toMatchObject({ ok: false, reason: "wrong" });
    expect(call("auth:unlock", "1234")).toEqual({ ok: true });
  });

  it("data channels work again once unlocked, passing the arguments through", () => {
    const auth = setup();
    auth.setPin("1234");
    auth.lock();
    call("auth:unlock", "1234");

    expect(call("transactions:list", "2026-09")).toEqual(["movimientos"]);
    expect(data.listTransactions).toHaveBeenCalledWith("2026-09");
    expect(call("transactions:summary", { from: "2026-08", to: "2026-09" }, 3)).toEqual(["resumen"]);
    expect(data.summaryByCategory).toHaveBeenCalledWith({ from: "2026-08", to: "2026-09" }, 3);
    expect(call("settings:getCurrency")).toBe("USD");
  });

  it("locking again blocks the data channels", () => {
    const auth = setup();
    auth.setPin("1234");
    expect(call("transactions:list", "2026-09")).toEqual(["movimientos"]);
    call("auth:lock");
    expect(() => call("transactions:list", "2026-09")).toThrow(/bloqueada/);
  });
});

describe("IPC channels without a PIN", () => {
  it("never blocks anything", () => {
    setup();
    expect(call("members:list")).toEqual(["Ana"]);
    expect(call("transactions:categories", "expense")).toEqual(["Comida"]);
  });
});
