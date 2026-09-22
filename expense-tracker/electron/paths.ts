import path from "node:path";

/**
 * Carpeta del export estático de Next.js una vez empaquetada la app. `dirname` es el
 * `__dirname` de `main.ts` ya compilado (`dist-electron/electron/`); `out/` queda **dos**
 * niveles arriba (hermano de `dist-electron/`, no adentro de esa carpeta) — confirmado
 * listando el `.asar` generado por `electron-builder`.
 */
export function productionOutDir(dirname: string): string {
  return path.join(dirname, "../../out");
}

/**
 * Resuelve el pathname de una request `app://bundle/...` a un archivo dentro de `outDir`,
 * o `null` si se saldría de esa carpeta (path traversal, ej. `/../../etc/passwd`).
 * `/` se sirve como `index.html`, la página única de esta app.
 *
 * Hace falta este esquema propio (en vez de `loadFile`/`file://`) porque el export estático
 * de Next.js genera rutas de JS/CSS absolutas ("/_next/...") que bajo `file://` se resuelven
 * contra la raíz del disco, no contra `out/`, y la ventana queda en blanco (ni un error: los
 * `<script src="/_next/...">` simplemente no cargan). Con un esquema "standard" registrado,
 * esas rutas absolutas sí se resuelven contra el origen `app://bundle/`.
 */
export function resolveAppRequest(outDir: string, pathname: string): string | null {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const resolved = path.join(outDir, relative);
  const escapesOutDir = path.relative(outDir, resolved).startsWith("..");
  return escapesOutDir ? null : resolved;
}
