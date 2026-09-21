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
- Categorías: además de las fijas (`EXPENSE_CATEGORIES`/`INCOME_CATEGORIES` en `src/lib/types.ts`), el usuario puede escribir una categoría nueva libremente en el formulario (ver detalle abajo).
- Selector de mes y gráfico de gastos por categoría: implementados en el paso 5 (ver abajo).

## Scripts

- `npm run dev`: levanta Next.js (`localhost:3000`) y Electron en paralelo (`concurrently`); Electron espera a que Next esté listo (`wait-on`) y carga esa URL.
- `npm run build`: `next build` (export estático a `out/`) + compila `electron/*.ts` a `dist-electron/` + `electron-builder` genera el instalador.
- `npm test`: corre los tests con Vitest (`vitest.config.mts`, entorno node, alias `@` → `src/`). Los `*.test.ts` viven junto al código que prueban (`src/lib/`) y están excluidos de la compilación de Electron en `electron/tsconfig.json`. `npm run test:watch` para modo watch. Cubren lógica pura (`date`, `category-totals`, `schema`, `chart-colors`) y la capa de datos (`electron/db/repository.test.ts`, ver abajo).
- `npm run db:generate`: corre `drizzle-kit generate` y regenera los archivos `.sql` en `electron/db/migrations/` a partir de `electron/db/schema.ts`. Correr después de cualquier cambio al schema.

## Base de datos (paso 3, ya implementado)

- `electron/db/schema.ts`: la tabla `transactions` (`id` autoincrement, `type`, `amount`, `category`, `description`, `date`, `excluded`). **El monto se guarda en centavos (integer)**, no en decimal, para evitar errores de redondeo de punto flotante — la conversión centavos↔decimal se hace en la capa que consuma esta tabla (paso 4).
- `electron/db/migrations/`: migraciones SQL generadas por `drizzle-kit`, se commitean al repo (son el historial versionado del esquema).
- `electron/db/client.ts`: abre `expense-tracker.db` en `app.getPath('userData')` y corre las migraciones pendientes (`runMigrations()`, llamado desde `electron/main.ts` en `app.whenReady()`).
- `build:electron` copia `electron/db/migrations/**` a `dist-electron/electron/db/migrations/` para que el `migrate()` en runtime las encuentre al lado del JS compilado, tanto en dev como una vez empaquetada la app.

## IPC (paso 4, ya implementado)

- `electron/tsconfig.json` tiene `rootDir: ".."` (la raíz del proyecto, no `electron/`) para poder incluir `src/lib/**/*.ts` en su compilación además de `electron/**/*.ts`. Por eso el JS compilado queda en `dist-electron/electron/...` y `dist-electron/src/lib/...` (no directo en `dist-electron/`) — el campo `"main"` de `package.json` apunta a `dist-electron/electron/main.js`.
- `electron/db/transactions.ts` (la lógica está en `repository.ts`, ver "Capa de datos y sus tests"): capa de acceso a datos (`listTransactions`, `createTransaction`, `deleteTransaction`), síncrona porque better-sqlite3 lo es. Importa `TransactionInputSchema` desde `src/lib/schema.ts` — **el mismo schema que usa el formulario**, no una copia — y convierte decimal↔centavos al leer/escribir.
- `electron/ipc.ts`: registra `ipcMain.handle` para `transactions:list`, `transactions:create`, `transactions:delete`, llamado desde `electron/main.ts` en `app.whenReady()`.
- `electron/preload.ts`: expone `window.api.transactions.{list,create,delete}` vía `contextBridge`.
- `src/lib/electron-api.d.ts`: tipa `window.api` para el renderer.
- **Importante para probar:** desde este paso, abrir `http://localhost:3000` en una pestaña de navegador normal ya NO alcanza para ver el flujo real — ahí no existe `window.api` (la UI muestra un aviso). Para ver la persistencia hay que mirar la ventana de Electron (`npm run dev`).
- `listCategories(type)` en `electron/db/transactions.ts` (`db.selectDistinct`) + canal `transactions:categories`: devuelve las categorías ya usadas para ese tipo, para sugerirlas en el formulario (ver paso 5 → categorías propias).

## Selector de mes y gráfico (paso 5, ya implementado)

- `src/lib/date.ts`: helpers de mes (`currentMonthKey`, `shiftMonth`, `formatMonthLabel`, `monthDateRange`). `MonthKey` es un string `"YYYY-MM"`.
- El filtro por mes se resuelve **en la consulta SQL**, no en el cliente: `listTransactions(month)` en `electron/db/transactions.ts` usa `monthDateRange` y filtra con `and(gte(date, from), lte(date, to))`. `transactions:list` (IPC, preload y `window.api`) ahora recibe ese `month` como parámetro.
- `src/components/MonthNav.tsx`: fila de pestañas con 6 meses a la vez (ej. `Abr 26 · May 26 · ... · Sept 26`), para saltar directo a un mes sin clickear de a uno. La ventana de 6 meses visible (`windowEnd`, estado interno del componente) es independiente del mes seleccionado (`month`, prop controlada por `page.tsx`): clickear una pestaña cambia `month`; las flechas `◀ ▶` solo deslizan la ventana un mes (no cambian la selección, así podés navegar hacia atrás/adelante sin perder de vista qué mes estás mirando). El subtítulo con el mes completo (`formatMonthLabel`) sigue en el header, porque la pestaña seleccionada puede quedar fuera de la ventana visible tras deslizar.
- `src/components/CategoryChart.tsx`: **eliminado** (barras horizontales por categoría). Lo reemplazó el donut (`CategoryDonut`) en la pestaña del mes y los gráficos de la pestaña de comparación. Sigue en el historial de git si hiciera falta. Del gráfico original se mantiene la decisión de dataviz: bar chart para comparar magnitud, con el color fijo por categoría (`categoryColor()`), descrita en los puntos siguientes.
- **Color por categoría:** cada categoría tiene un color fijo (no por posición en el gráfico, para que no cambie según qué otras categorías tenga al lado ese mes) — mapeo en `src/lib/chart-colors.ts` (`categoryColor()`), aplicado con `<Cell>` de Recharts. Los 6 colores son la paleta categórica de la skill de dataviz (orden fijo: azul, naranja, aqua, amarillo, magenta, verde), validada con `validate_palette.js` contra las superficies reales de la app (`#ffffff`/`#18181b`) — pasa separación CVD y contraste; 3 de los 6 tonos en modo claro quedan bajo 3:1 de contraste, lo cual la skill permite siempre que haya "relief" (labels visibles), que ya tenemos en cada barra.
- Los colores del gráfico están en variables CSS (`--series-1..6`, `--chart-grid`, `--chart-text` en `globals.css`, con su versión dark en el `@media (prefers-color-scheme: dark)`), porque Recharts no puede leer las clases `dark:` de Tailwind — necesita valores de color reales. Verificado que el `fill` computado real cambia con el tema (ej. `--series-1` pasa de `#2a78d6` a `#3987e5`).
- `src/components/CategoryDonut.tsx`: gráfico redondo (donut) con el porcentaje de cada categoría sobre el total de gastos del mes, debajo del gráfico de barras. Usa `categoryColor()` (mismos colores que las barras), el total en el centro y una leyenda con monto y porcentaje por categoría (así la identidad no depende solo del color). El agrupado por categoría está compartido con `CategoryChart` en `src/lib/category-totals.ts`.
- Nota de Recharts: `<LabelList>` no aparece hasta que termina la animación de entrada de la barra (~1.5s) — es comportamiento normal de la librería, no un bug.
- **Categorías propias:** el campo Categoría de `TransactionForm` es un `<input list="...">` (combobox nativo con `<datalist>`), no un `<select>` cerrado — el usuario puede elegir una sugerida o escribir cualquier texto nuevo. `category` en la base ya era `text()` libre, sin `enum`, así que no hizo falta tocar el schema de SQLite. Las sugerencias combinan las categorías fijas con las que ya se usaron antes (`listCategories`/`transactions:categories`), y se refrescan después de cada alta para que una categoría recién escrita quede disponible enseguida. Una categoría fuera de las 6 fijas recibe un color propio y estable: `categoryColor()` le asigna el siguiente de una secuencia HSL (matiz avanzando el ángulo áureo, saturación/luminosidad de `--extra-s`/`--extra-l` según tema), y guarda la asignación en `localStorage` (`expense-tracker:category-colors`) para que no cambie entre sesiones. Ojo: estos colores generados no pasaron por `validate_palette.js` (la skill de dataviz desaconseja hues nuevos), pedido explícito del usuario; los labels en cada barra siguen dando el "relief".

## Capa de datos y sus tests

- La lógica de acceso a datos vive en `electron/db/repository.ts` (`createTransactionsRepository(db)`), que **recibe la base como parámetro** y no importa nada de Electron. `electron/db/transactions.ts` es solo el enlace con la base real (`client.ts`) y re-exporta las funciones; `ipc.ts` lo sigue importando igual. Cualquier operación nueva de datos va en `repository.ts`.
- `electron/db/repository.test.ts` crea una base **en memoria** (`:memory:`) por test y le aplica las migraciones reales de `electron/db/migrations/`, así que nunca toca los datos de la app y además valida que las migraciones dejan el esquema que el código espera. Cubre centavos↔decimal, filtro por mes (bordes y bisiestos), orden, borrado, desactivar y categorías.
- Requiere que `better-sqlite3` esté compilado para el Node normal (hoy lo está). Si `electron-rebuild` lo recompila para Electron y `npm test` deja de poder cargarlo, habrá que recompilarlo para Node (p. ej. `npm rebuild better-sqlite3`) y volver a recompilarlo para Electron antes de empaquetar.

## Desactivar movimientos

- La tabla `transactions` tiene la columna `excluded` (boolean, `default false`, migración `0001`). Un movimiento desactivado **se conserva y se sigue viendo en la lista** (atenuado y con el monto tachado), pero **no cuenta** en el resumen del mes (`page.tsx` lo filtra antes de sumar) ni en el donut (`expenseTotalsByCategory` lo ignora).
- Botón de "ojo" al lado del de borrar en `TransactionList`: llama a `window.api.transactions.setExcluded(id, excluded)` → canal IPC `transactions:setExcluded` → `setTransactionExcluded` en `electron/db/transactions.ts`, que valida con `SetExcludedSchema` (Zod, en `src/lib/schema.ts`). Se fija el valor explícito (no un toggle en SQL) para que sea determinista.
- Cualquier cálculo futuro de totales (p. ej. la comparativa entre meses) debe respetar `excluded`.

## Pestañas y comparación por categoría

- `src/app/page.tsx` tiene el título, la moneda (compartida) y las pestañas (`TabBar`): **Ingresos y gastos** (`MonthView`, todo lo del mes) y **Comparación por categoría** (`ComparisonView`). Ambas vistas siguen montadas (la inactiva con `hidden`) para conservar su estado; `ComparisonView` recibe `active` y vuelve a pedir los datos al activarse, porque en la otra pestaña pudieron cambiar los movimientos. La pestaña de comparación usa un ancho mayor (`max-w-5xl`).
- **Intervalo:** meses seguidos, elegidos con `RangePicker` (dos `<input type="month">` Desde/Hasta + atajos 2/3/6/12 meses que cuentan hacia atrás desde "Hasta"). **Máximo 12 meses** (`MAX_COMPARISON_MONTHS`). Se valida con `MonthRangeSchema` (Zod, `src/lib/schema.ts`), el mismo en la UI y en el repositorio; si es inválido se muestra el mensaje, no se consulta, y se mantiene el render anterior atenuado. Por defecto, los últimos 6 meses.
- **Datos:** `summaryByCategory({from, to})` en `electron/db/repository.ts` agrupa en SQL por mes y categoría, **solo gastos y sin los desactivados** (`excluded`); canal IPC `transactions:summary`. Trae todas las categorías del intervalo y el filtro por categoría se hace en el cliente (cambiar de categoría no vuelve a consultar). `src/lib/comparison.ts` (`buildComparison`, `categoryStats`, `percentChange`) arma la matriz categoría × mes rellenando con 0 los meses sin gasto y es lógica pura con tests.
- **Selector de categoría:** "Todas las categorías" (por defecto) o una concreta; las opciones son las fijas + las ya usadas + las del intervalo.
  - *Todas:* un panel pequeño por categoría (`CategoryPanels`), todos con la **misma escala vertical** para poder comparar entre categorías, más una tabla categoría × mes con total y variación del último mes (`ComparisonTable`).
  - *Una categoría:* 4 cifras (total, media mensual, mes más alto, último mes vs anterior), gráfico de columnas grande con etiqueta solo en el mes más alto y el último (`CategoryDetail`), y tabla mes a mes con variación.
- La variación (`Change`) usa flecha y signo además del color (subir un gasto = rojo, bajar = verde); con mes anterior en 0 no hay base y se muestra "—".
- Los colores salen de `categoryColor()`, igual que el donut. Los nombres de mes completos se escriben con `formatMonthTitle` ("Septiembre de 2026"); la clase CSS `capitalize` pondría en mayúscula también la "de".
- **Cómo se verificó la UI sin Electron:** se construyó el export estático (`npx next build`), se sirvió `out/` con un `window.api` simulado inyectado en el `<head>` y se sacaron capturas con Chrome headless (claro/oscuro, 2 y 6 meses, una categoría, intervalo inválido). Los datos del simulado eran inventados y no se guardó nada en la app. Conviene igualmente revisarlo con datos reales en `npm run dev`.

## Convenciones

- IDs de las tablas propias del proyecto: autoincrement numérico (no UUID).
- Validar con Zod tanto en el formulario (cliente) como en el handler IPC (servidor).
- Antes de implementar algo específico de una librería del stack (Next.js, Electron, Drizzle, Zod, Recharts, better-sqlite3), consultar documentación actualizada con el MCP **context7** en vez de asumir la API de memoria — las versiones y APIs cambian seguido.
