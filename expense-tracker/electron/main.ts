import { app, BrowserWindow, net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createAuth, type Auth } from "./auth";
import { db, runMigrations } from "./db/client";
import { createSettingsRepository } from "./db/settings";
import { registerIpcHandlers } from "./ipc";
import { productionOutDir, resolveAppRequest } from "./paths";

const isDev = !app.isPackaged;

// El export estático de Next.js genera rutas de JS/CSS absolutas ("/_next/...") que bajo
// `file://` no resuelven contra `out/` (resuelven contra la raíz del disco) y la ventana
// queda en blanco. Se registra un esquema propio, "app://bundle/...", que sí las resuelve
// contra `out/` (ver electron/paths.ts). Tiene que registrarse antes de `app.whenReady()`.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function createWindow(auth: Auth) {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // En macOS la app sigue viva al cerrar la ventana y se puede reabrir: se vuelve a bloquear.
  win.on("closed", () => auth.lock());

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadURL("app://bundle/index.html");
  }
}

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = resolveAppRequest(productionOutDir(__dirname), pathname);
    if (!filePath) return new Response("bad", { status: 400 });
    return net.fetch(pathToFileURL(filePath).toString());
  });

  runMigrations();
  const settings = createSettingsRepository(db);
  const auth = createAuth({ store: settings });
  registerIpcHandlers({ auth, settings });
  createWindow(auth);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(auth);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
