# Expense Tracker

App de escritorio para controlar los ingresos y gastos del mes. Ver `CLAUDE.md` para el stack, la arquitectura y el alcance del proyecto.

## Desarrollo

```bash
npm run dev
```

Levanta Next.js en `http://localhost:3000` y abre la ventana de Electron apuntando a esa URL.

## Build

```bash
npm run build
```

Exporta Next.js como sitio estático, compila el proceso principal de Electron y genera el instalador con `electron-builder`.
