import { app, BrowserWindow } from "electron";
import path from "node:path";
import { createAuth, type Auth } from "./auth";
import { db, runMigrations } from "./db/client";
import { createSettingsRepository } from "./db/settings";
import { registerIpcHandlers } from "./ipc";

const isDev = !app.isPackaged;

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
    win.loadFile(path.join(__dirname, "../out/index.html"));
  }
}

app.whenReady().then(() => {
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
