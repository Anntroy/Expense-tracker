"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/error-message";

const secondaryButton =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

/**
 * Sección "Copia de seguridad" de Configuración. Los diálogos de archivo y la confirmación
 * antes de importar son nativos y los abre el proceso principal (ver electron/backup.ts);
 * tras importar, el proceso principal recarga la ventana.
 */
export function BackupSettings() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setDone(await action());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const handleExport = () =>
    run(async () => {
      const result = await window.api.backup.export();
      return result.status === "saved" ? `Copia guardada en ${result.filePath}` : null;
    });

  const handleImport = () =>
    run(async () => {
      const result = await window.api.backup.import();
      return result.status === "imported" ? "Copia importada. Recargando…" : null;
    });

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Copia de seguridad</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Guarda todos los datos (movimientos, miembros, moneda y PIN) en un archivo, para
          tenerlos a salvo o pasarlos a otro ordenador. Importar una copia reemplaza los datos
          de este ordenador; antes se guarda una copia de los actuales.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleExport} disabled={busy} className={secondaryButton}>
          Exportar copia…
        </button>
        <button type="button" onClick={handleImport} disabled={busy} className={secondaryButton}>
          Importar copia…
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {done && <p className="break-all text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
    </section>
  );
}
