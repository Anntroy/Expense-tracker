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

- Registrar ingresos, gastos y ahorro (monto, tipo, categoría, fecha, descripción).
- Balance y resumen del mes (total ingresos, total gastos, balance).
- Gráficos por categoría.
- Moneda: **una sola moneda configurable** (elegida una vez en Configuración, ej. EUR, USD). Todos los movimientos y totales se muestran en esa moneda. No hay conversión entre monedas ni tasas de cambio — si el usuario cambia la moneda, solo cambia el formato/símbolo con el que se muestran los montos ya guardados.
- Categorías: además de las fijas (`EXPENSE_CATEGORIES`/`INCOME_CATEGORIES` en `src/lib/types.ts`), el usuario puede escribir una categoría nueva libremente en el formulario (ver detalle abajo).
- Selector de mes y gráfico de gastos por categoría: implementados en el paso 5 (ver abajo).

## Scripts

- `npm run dev`: levanta Next.js (`localhost:3000`) y Electron en paralelo (`concurrently`); Electron espera a que Next esté listo (`wait-on`) y carga esa URL.
- `npm run build`: `next build` (export estático a `out/`) + compila `electron/*.ts` a `dist-electron/` + `electron-builder` genera el instalador.
- `npm test`: corre los tests con Vitest (`vitest.config.mts`, entorno node, alias `@` → `src/`). Los `*.test.ts` viven junto al código que prueban (`src/lib/`) y están excluidos de la compilación de Electron en `electron/tsconfig.json`. `npm run test:watch` para modo watch. Cubren lógica pura (`date`, `category-totals`, `schema`, `chart-colors`) y la capa de datos (`electron/db/repository.test.ts`, ver abajo).
- **Contrato entre `preload.ts` e `ipc.ts`:** los nombres de canal son texto en dos archivos. `electron/channels.test.ts` comprueba que cada canal que invoca el preload tiene manejador y que cada manejador tiene quién lo invoque (sin repetidos y con el formato `area:accion`); y `preload.ts` usa `satisfies ElectronApi`, así que un método que falte o cambie de firma respecto a `src/lib/electron-api.d.ts` no compila. Al añadir un canal hay que tocar los cuatro sitios: `ipc.ts` (con `guarded` si es de datos), `preload.ts`, `electron-api.d.ts` y, si procede, sus tests.
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

## Ahorro como tercer tipo de movimiento

- `TransactionType` es `'income' | 'expense' | 'saving'` (`TRANSACTION_TYPES` en `src/lib/types.ts`, usado también por Zod). **No hizo falta migración**: en SQLite la columna `type` es texto sin restricción y el `enum` de `schema.ts` solo existe en TypeScript, así que los datos anteriores siguen igual.
- **Cómo cuenta el ahorro:** es dinero que se aparta, no un gasto. El resumen del mes tiene una tarjeta **Ahorro** propia y **Balance = ingresos − gastos − ahorro** (la tarjeta avisa "Tras descontar el ahorro" cuando hay ahorro). Si en algún momento se prefiere que el ahorro no reste del balance, el cálculo está en `MonthView.tsx`.
- **No entra en el donut ni en la comparación por categoría**: `expenseTotalsByCategory` y `summaryByCategory` siguen siendo solo de gastos. (El ahorro por meses se ve en la pestaña «Ahorro».) Sí respeta el filtro por persona, el botón de desactivar y los miembros como cualquier movimiento.
- **Formulario:** el interruptor de dos posiciones se sustituyó por un selector de tres opciones (`role="radiogroup"`: Ingreso / Gasto / Ahorro). Categorías fijas del ahorro: `SAVING_CATEGORIES` (Fondo de emergencia, Vacaciones, Jubilación, Otros), más las que se hayan escrito antes (`listCategories('saving')`).
- **Lista:** el ahorro va en azul, sin signo `+`/`-`, y con una etiqueta "Ahorro" junto a la categoría para no depender solo del color.

## Pestaña «Ahorro»

- Muestra el ahorro del **periodo elegido**: mismo selector de intervalo que la comparación (`RangePicker`: Desde/Hasta + atajos 2/3/6/12, **máximo 12 meses**, por defecto los últimos 6) y filtro por persona. Usa `useCategorySummary` con `type: 'saving'`, así que respeta los movimientos desactivados y el filtro por persona.
- **Contenido** (`SavingsView`): 4 cifras (total ahorrado, media mensual, mes con más ahorro, último mes vs anterior), gráfico de columnas del ahorro mensual (`MonthlyBarChart`, etiquetas solo en el mes más alto y el último), desglose **por categoría** (importe, porcentaje y barra proporcional en un solo azul) y tabla mes a mes con la variación y el **acumulado** del periodo. Sin ahorro en el intervalo, muestra un aviso en lugar de un gráfico vacío.
- La variación usa `<Change upIsGood />`: en el ahorro **subir es bueno** (verde) y bajar es malo (rojo), al revés que en los gastos.
- Color del ahorro: variable CSS `--saving` (`#0284c7` en claro, `#38bdf8` en oscuro, los mismos tonos que `text-sky-600`/`dark:text-sky-400` de las tarjetas y la lista).
- El ahorro no está en el donut ni en la comparación de gastos; esta pestaña es el único sitio donde se compara por meses.

## Miembros del hogar («quién»)

- Modelo "tesorería única del hogar": **no hay usuarios ni cuentas**, todos ven todo. Los miembros son solo etiquetas para saber quién pagó (gasto) o cobró (ingreso). Decisión tomada para una unidad familiar donde nadie necesita cuentas privadas; si algún día hiciera falta privacidad entre miembros, habría que pasar a usuarios de verdad (ver el plan de varios usuarios), y el campo `member_id` serviría de base.
- Tabla `members` (`id` autoincrement, `name`, `archived`) y `transactions.member_id` **opcional** (migración `0002`): los movimientos anteriores quedan "Sin asignar". La migración se prueba sobre una base con datos.
- Reglas (en `electron/db/repository.ts`, con Zod en `src/lib/schema.ts`): **máximo 5 miembros activos** (`MAX_MEMBERS`; los archivados no cuentan, y restaurar también respeta el máximo), nombre de 1 a 30 caracteres, y **sin nombres repetidos ignorando mayúsculas, incluso si el otro está archivado**. Quitar un miembro es **archivarlo**: deja de poder elegirse pero sus movimientos conservan el nombre. `createTransaction` rechaza un miembro inexistente o archivado.
- IPC: `members:list`, `members:create`, `members:rename`, `members:setArchived` (expuestos como `window.api.members.*`). Los errores del proceso principal llegan con el prefijo "Error invoking remote method…"; `errorMessage()` (`src/lib/error-message.ts`) lo quita para mostrarlos.
- UI: botón de engranaje en la cabecera → `SettingsDialog` (`<dialog>` nativo) con alta, renombrado, archivado y restauración. `page.tsx` carga los miembros con el hook `useMembers` y los pasa a `MonthView`. El formulario muestra el selector **Quién** solo si hay miembros activos, y **siempre propone el primero** (el más antiguo de los activos) por defecto; "Sin asignar" sigue disponible a mano, y la elección se mantiene mientras se agregan varios movimientos seguidos. No se recuerda entre sesiones a propósito (pedido explícito: que siempre salga el primero). La lista muestra el nombre junto a la categoría.

## Bloqueo con PIN opcional (fase 3)

- **Qué es y qué no es:** un PIN de 4 a 8 dígitos (`PinSchema`) que se pide al abrir la app. Protege la app, **no cifra el archivo de la base de datos** (para eso: FileVault y la contraseña del sistema). **No hay recuperación**: si se olvida, hay que borrar a mano la fila `pin` de la tabla `settings`. Se avisa de todo esto en Configuración → Seguridad.
- **Se hace cumplir en el proceso principal, no en la interfaz.** `electron/auth.ts` (`createAuth`) guarda el estado bloqueado/desbloqueado en memoria; `electron/ipc.ts` envuelve **todos los canales de datos** con `guarded(...)`, que llama a `auth.assertUnlocked()` y rechaza con "La app está bloqueada." Los únicos canales que funcionan bloqueada son `auth:*`. **Cualquier canal IPC nuevo de datos debe ir con `guarded`**; `electron/ipc.test.ts` recorre todos los canales registrados y falla si alguno (que no sea `auth:*`) responde estando bloqueada.
- **Guardado:** solo un hash con sal (`scrypt` de `node:crypto`, sin dependencias nuevas) en `settings` bajo la clave `pin`, con formato `sal:hash` en hexadecimal; se compara con `timingSafeEqual`. Nunca se guarda el PIN.
- **Fuerza bruta:** cada 5 fallos seguidos hay una espera: 30 s, luego 60 s, 2 min... con tope de 30 min; durante la espera ni el PIN correcto se comprueba. El contador está en memoria y se reinicia al cerrar la app (quien tenga acceso al archivo se salta la app de todos modos). Cambiar o quitar el PIN exige el actual y también cuenta para el límite.
- **Cuándo se bloquea:** al arrancar (si hay PIN), con el botón "Bloquear" de la cabecera (solo aparece si hay PIN) y al **cerrar la ventana** (`win.on("closed")` en `main.ts`; en macOS la app sigue viva al cerrar la ventana y se puede reabrir). Al activar o cambiar el PIN la sesión actual sigue desbloqueada.
- **Interfaz:** `LockGate` (en `page.tsx`) muestra `LockScreen` mientras esté bloqueada y **solo monta `AppShell` (la app) una vez desbloqueada**, porque sus componentes piden datos al arrancar y el proceso principal los rechazaría. Sin `window.api` (navegador normal) deja pasar. La gestión del PIN (activar/cambiar/quitar) está en `PinSettings`, dentro de `SettingsDialog`. `page.tsx` quedó como un envoltorio fino; el contenido de antes vive en `AppShell.tsx`.
- **Ajustes (`settings`, migración `0003`):** tabla clave/valor con repositorio propio (`electron/db/settings.ts`, recibe la base por parámetro como el de movimientos). De paso, **la moneda ahora se guarda** (`settings:getCurrency` / `settings:setCurrency`, por defecto EUR) y ya no se pierde al cerrar la app.
- **Tests:** `electron/auth.test.ts` (hash con sal, espera y tope, reinicio del contador, cambiar/quitar), `electron/ipc.test.ts` (todos los canales de datos rechazados estando bloqueada, con `electron` y la capa de datos simulados), `electron/db/settings.test.ts` y los schemas nuevos.

## Ver por persona (fase 2)

- **Pestaña del mes:** si hay miembros, aparece un selector compacto **"Persona"** centrado bajo las pestañas de mes (se resalta el borde cuando hay un filtro activo). Acota las cifras, el donut y la lista a una persona; el filtro se hace en el cliente (`matchesPerson`) sobre los movimientos ya cargados del mes. Si se agrega un movimiento que quedaría oculto por el filtro, el filtro se quita para que se vea (mismo criterio que el cambio de mes al agregar). Hubo una tabla "Por persona" con ingresos/gastos/balance de cada miembro y se **quitó a propósito** (no gustó); está en el historial de git (`MemberBreakdown`, `totalsByMember`).
- **Pestaña de comparación:** selector "Persona" junto al de categoría (solo si hay miembros) y aviso "Mostrando solo los gastos de …". Aquí el filtro va **en la consulta SQL**: `summaryByCategory(range, memberId?)` (`omitido` = todas, `null` = sin asignar, número = ese miembro; validado con `MemberFilterSchema`) y `transactions:summary` recibe ese segundo parámetro.
- Lógica pura y con tests en `src/lib/member-totals.ts` (`matchesPerson`, `filterToMemberId`, `personOptions`, `personLabel`); `roundCents` pasó a `src/lib/money.ts` y lo comparten esa lógica y la de comparación. El selector es `PersonSelect`. Los valores de filtro de la interfaz son `""` (todas), `"none"` (sin asignar) o el id del miembro como texto.

## La vista sigue a la fecha del formulario

- Al elegir una fecha completa en `TransactionForm` (`onDateChange`), `MonthView` cambia al mes de esa fecha y muestra sus movimientos. Al agregar un movimiento cuya fecha cae en otro mes, también pasa a ese mes (`handleAdd`), para que el movimiento nuevo se vea enseguida.
- `MonthNav` reacciona a cambios de `month` hechos desde fuera: si el mes queda fuera de la ventana de 6 pestañas, la desliza para que se vea. Solo lo hace cuando `month` cambia, así que deslizar con las flechas `◀ ▶` sigue sin cambiar la selección.

## Desactivar movimientos

- La tabla `transactions` tiene la columna `excluded` (boolean, `default false`, migración `0001`). Un movimiento desactivado **se conserva y se sigue viendo en la lista** (atenuado y con el monto tachado), pero **no cuenta** en el resumen del mes (`page.tsx` lo filtra antes de sumar) ni en el donut (`expenseTotalsByCategory` lo ignora).
- Botón de "ojo" al lado del de borrar en `TransactionList`: llama a `window.api.transactions.setExcluded(id, excluded)` → canal IPC `transactions:setExcluded` → `setTransactionExcluded` en `electron/db/transactions.ts`, que valida con `SetExcludedSchema` (Zod, en `src/lib/schema.ts`). Se fija el valor explícito (no un toggle en SQL) para que sea determinista.
- Cualquier cálculo futuro de totales (p. ej. la comparativa entre meses) debe respetar `excluded`.

## Pestañas y comparación por categoría

- `AppShell.tsx` (que monta `page.tsx` tras el bloqueo) tiene el título, la moneda (compartida) y las pestañas (`TabBar`): **Ingresos y gastos** (`MonthView`, todo lo del mes), **Comparación por categoría** (`ComparisonView`) y **Ahorro** (`SavingsView`, ver más abajo). Las vistas siguen montadas (las inactivas con `hidden`) para conservar su estado; las de comparación y ahorro reciben `active` y vuelven a pedir los datos al activarse, porque en otra pestaña pudieron cambiar los movimientos. Esas dos usan un ancho mayor (`max-w-5xl`).
- **Lógica de carga compartida** entre comparación y ahorro: `useMonthRange` (`src/lib/use-month-range.ts`: `from`/`to`, intervalo válido y error) y `useCategorySummary` (`src/lib/use-category-summary.ts`: pide `transactions:summary` para un tipo de movimiento y arma la matriz categoría × mes; devuelve también `stale` para atenuar mientras carga). El gráfico mensual de una serie (`MonthlyBarChart`) y las cifras resumen (`StatTile`) también son compartidos.
- **Intervalo:** meses seguidos, elegidos con `RangePicker` (dos `<input type="month">` Desde/Hasta + atajos 2/3/6/12 meses que cuentan hacia atrás desde "Hasta"). **Máximo 12 meses** (`MAX_COMPARISON_MONTHS`). Se valida con `MonthRangeSchema` (Zod, `src/lib/schema.ts`), el mismo en la UI y en el repositorio; si es inválido se muestra el mensaje, no se consulta, y se mantiene el render anterior atenuado. Por defecto, los últimos 6 meses.
- **Datos:** `summaryByCategory({from, to}, memberId?, type = 'expense')` en `electron/db/repository.ts` agrupa en SQL por mes y categoría un tipo de movimiento (**por defecto gastos**; también admite `'saving'` e `'income'`), **sin los desactivados** (`excluded`); canal IPC `transactions:summary`. Trae todas las categorías del intervalo y el filtro por categoría se hace en el cliente (cambiar de categoría no vuelve a consultar). `src/lib/comparison.ts` (`buildComparison`, `categoryStats`, `percentChange`) arma la matriz categoría × mes rellenando con 0 los meses sin gasto y es lógica pura con tests.
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
