# Expense Tracker (Desktop)

App de escritorio para controlar los ingresos y gastos del mes.

## Stack

- **UI:** Next.js (App Router, TypeScript, Tailwind), exportado como sitio estático (`output: 'export'`) y cargado dentro de una ventana de Electron.
- **Empaquetado de escritorio:** Electron (`electron-builder` para generar los instaladores, `electron-rebuild` para el módulo nativo de sqlite).
- **Persistencia:** SQLite local vía **Drizzle ORM + better-sqlite3**. No usar Prisma en este proyecto: su motor binario complica el empaquetado con Electron.
- **Validación:** Zod. El mismo schema se reusa en el formulario del renderer y en el handler IPC que escribe en la base — nunca handroll de validaciones.
- **Gráficos:** Recharts.

## Arquitectura

- El proceso principal de Electron es el único dueño de la base de datos (guardada en `app.getPath('userData')`) y expone las operaciones de datos (crear/listar/borrar movimiento, resumen mensual) vía `ipcMain.handle`.
- El renderer (Next.js) nunca accede a Node/SQLite directamente: llama a esas operaciones a través de un `preload.ts` con `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`).

## Alcance v1

- Registrar ingresos y gastos (monto, tipo, categoría, fecha, descripción).
- Balance y resumen del mes (total ingresos, total gastos, balance).
- Gráficos por categoría.
- Moneda: **una sola moneda configurable** (elegida una vez en Configuración, ej. EUR, USD). Todos los movimientos y totales se muestran en esa moneda. No hay conversión entre monedas ni tasas de cambio — si el usuario cambia la moneda, solo cambia el formato/símbolo con el que se muestran los montos ya guardados.
- Categorías de gastos: en v1 son una lista fija (`EXPENSE_CATEGORIES` en `src/lib/types.ts`). **Pendiente para más adelante:** permitir que el usuario cree sus propias categorías de gastos (no está en el alcance v1, no implementar todavía).
- **Pendiente para el paso 5 (UI):** separar ingresos y gastos por mes con un selector de mes (ej. `◀ Septiembre 2026 ▶`) que filtre el resumen y la lista según el campo `date` (agrupando por `YYYY-MM`). Cuando exista la capa de datos en SQLite (paso 3/4), el filtro por mes debe resolverse en la consulta a la base (`WHERE date BETWEEN ...`), no trayendo todos los movimientos y filtrando en el cliente.

## Scripts

- `npm run dev`: levanta Next.js (`localhost:3000`) y Electron en paralelo (`concurrently`); Electron espera a que Next esté listo (`wait-on`) y carga esa URL.
- `npm run build`: `next build` (export estático a `out/`) + compila `electron/*.ts` a `dist-electron/` + `electron-builder` genera el instalador.
- `npm run db:generate`: corre `drizzle-kit generate` y regenera los archivos `.sql` en `electron/db/migrations/` a partir de `electron/db/schema.ts`. Correr después de cualquier cambio al schema.

## Base de datos (paso 3, ya implementado)

- `electron/db/schema.ts`: la tabla `transactions` (`id` autoincrement, `type`, `amount`, `category`, `description`, `date`). **El monto se guarda en centavos (integer)**, no en decimal, para evitar errores de redondeo de punto flotante — la conversión centavos↔decimal se hace en la capa que consuma esta tabla (paso 4).
- `electron/db/migrations/`: migraciones SQL generadas por `drizzle-kit`, se commitean al repo (son el historial versionado del esquema).
- `electron/db/client.ts`: abre `expense-tracker.db` en `app.getPath('userData')` y corre las migraciones pendientes (`runMigrations()`, llamado desde `electron/main.ts` en `app.whenReady()`).
- `build:electron` copia `electron/db/migrations/**` a `dist-electron/db/migrations/` para que el `migrate()` en runtime las encuentre al lado del JS compilado, tanto en dev como una vez empaquetada la app.

## Convenciones

- IDs de las tablas propias del proyecto: autoincrement numérico (no UUID).
- Validar con Zod tanto en el formulario (cliente) como en el handler IPC (servidor).
- Antes de implementar algo específico de una librería del stack (Next.js, Electron, Drizzle, Zod, Recharts, better-sqlite3), consultar documentación actualizada con el MCP **context7** en vez de asumir la API de memoria — las versiones y APIs cambian seguido.
