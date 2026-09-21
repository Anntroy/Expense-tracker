import { beforeEach, describe, expect, it, vi } from "vitest";

function fakeLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

// `chart-colors` guarda las asignaciones en una variable de módulo, así que
// cada test lo importa de cero para simular una sesión nueva.
async function loadModule() {
  vi.resetModules();
  return import("./chart-colors");
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("categoryColor", () => {
  it("fixed categories use their variable from the validated palette", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const { categoryColor } = await loadModule();
    expect(categoryColor("Vivienda")).toBe("var(--series-1)");
    expect(categoryColor("Otros")).toBe("var(--series-6)");
  });

  it("each custom category gets a distinct, stable color", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const { categoryColor } = await loadModule();
    const mascotas = categoryColor("Mascotas");
    const regalos = categoryColor("Regalos");
    expect(mascotas).not.toBe(regalos);
    expect(categoryColor("Mascotas")).toBe(mascotas);
    expect(mascotas).toMatch(/^hsl\(\d+ var\(--extra-s\) var\(--extra-l\)\)$/);
  });

  it("keeps the color across sessions thanks to localStorage", async () => {
    const storage = fakeLocalStorage();
    vi.stubGlobal("localStorage", storage);
    const first = await loadModule();
    const mascotas = first.categoryColor("Mascotas");
    const regalos = first.categoryColor("Regalos");

    // Sesión nueva: módulo recargado, mismo localStorage, categorías en otro orden.
    const second = await loadModule();
    expect(second.categoryColor("Regalos")).toBe(regalos);
    expect(second.categoryColor("Mascotas")).toBe(mascotas);
  });

  it("a new category does not reuse the color of already saved ones", async () => {
    const storage = fakeLocalStorage();
    vi.stubGlobal("localStorage", storage);
    const first = await loadModule();
    const existing = ["A", "B", "C"].map((c) => first.categoryColor(c));

    const second = await loadModule();
    expect(existing).not.toContain(second.categoryColor("D"));
  });

  it("does not break if localStorage fails or holds corrupt JSON", async () => {
    vi.stubGlobal("localStorage", fakeLocalStorage({ "expense-tracker:category-colors": "{no-json" }));
    const corrupt = await loadModule();
    expect(corrupt.categoryColor("Mascotas")).toMatch(/^hsl\(/);

    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    const blocked = await loadModule();
    expect(blocked.categoryColor("Mascotas")).toMatch(/^hsl\(/);
  });
});
