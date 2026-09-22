import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Los nombres de los canales IPC son texto en dos archivos distintos (`preload.ts` los
// invoca e `ipc.ts` los atiende) y TypeScript no comprueba que coincidan: un canal mal
// escrito solo falla al usarlo, con la app ya en marcha. Este test lo detecta antes.
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(path.join(here, file), "utf8");

function channels(source: string, call: "invoke" | "handle"): string[] {
  const owner = call === "invoke" ? "ipcRenderer" : "ipcMain";
  const pattern = new RegExp(`${owner}\\.${call}\\(\\s*"([^"]+)"`, "g");
  return [...source.matchAll(pattern)].map((m) => m[1]);
}

const invoked = channels(read("preload.ts"), "invoke");
const handled = channels(read("ipc.ts"), "handle");

describe("IPC channels: preload vs main process", () => {
  it("finds the channels in both files (guards against the regex silently matching nothing)", () => {
    expect(invoked.length).toBeGreaterThanOrEqual(15);
    expect(handled.length).toBeGreaterThanOrEqual(15);
  });

  it("every channel the preload invokes has a handler in the main process", () => {
    const missing = invoked.filter((c) => !handled.includes(c));
    expect(missing, `canales invocados sin manejador: ${missing.join(", ")}`).toEqual([]);
  });

  it("every handler in the main process is reachable from the preload", () => {
    const unreachable = handled.filter((c) => !invoked.includes(c));
    expect(unreachable, `manejadores que nadie invoca: ${unreachable.join(", ")}`).toEqual([]);
  });

  it("no channel is registered or invoked twice", () => {
    expect(new Set(invoked).size).toBe(invoked.length);
    expect(new Set(handled).size).toBe(handled.length);
  });

  it("all channels follow the 'area:action' naming", () => {
    for (const channel of [...invoked, ...handled]) {
      expect(channel, channel).toMatch(/^[a-z]+:[a-zA-Z]+$/);
    }
  });
});
