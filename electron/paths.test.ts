import path from "node:path";
import { describe, expect, it } from "vitest";
import { productionOutDir, resolveAppRequest } from "./paths";

describe("productionOutDir", () => {
  it("resolves to out/ next to dist-electron/, not inside it", () => {
    // dist-electron/electron/ es donde queda main.ts compilado (electron/tsconfig.json:
    // outDir "../dist-electron", rootDir ".."); out/ es una carpeta hermana de dist-electron/,
    // no una subcarpeta suya. Este test es el que hubiera agarrado el bug real de
    // "../out" (apuntaba adentro de dist-electron/, donde out/ no existe).
    const compiledMainDir = path.join("/proyecto", "dist-electron", "electron");
    expect(productionOutDir(compiledMainDir)).toBe(path.join("/proyecto", "out"));
  });
});

describe("resolveAppRequest", () => {
  const outDir = path.join("/proyecto", "out");

  it("serves index.html for the root", () => {
    expect(resolveAppRequest(outDir, "/")).toBe(path.join(outDir, "index.html"));
  });

  it("resolves a nested asset path from Next's static export", () => {
    expect(resolveAppRequest(outDir, "/_next/static/chunks/app.js")).toBe(
      path.join(outDir, "_next/static/chunks/app.js"),
    );
  });

  it("decodes URL-encoded characters", () => {
    expect(resolveAppRequest(outDir, "/favicon.ico%3Ffavicon.ico")).toBe(
      path.join(outDir, "favicon.ico?favicon.ico"),
    );
  });

  it("refuses to escape outDir (path traversal)", () => {
    expect(resolveAppRequest(outDir, "/../../etc/passwd")).toBeNull();
    expect(resolveAppRequest(outDir, "/..")).toBeNull();
  });
});
