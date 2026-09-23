"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BackupSettings } from "@/components/BackupSettings";
import { PinSettings } from "@/components/PinSettings";
import { errorMessage } from "@/lib/error-message";
import { MAX_MEMBERS } from "@/lib/schema";
import type { Member } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  members: Member[];
  /** Se llama después de cada cambio para recargar la lista de miembros. */
  onMembersChanged: () => void | Promise<void>;
  /** Hay un PIN configurado. */
  hasPin: boolean;
  /** Se llama tras activar, cambiar o quitar el PIN. */
  onAuthChanged: () => void | Promise<void>;
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const smallButton =
  "rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

/** Configuración de la app: miembros del hogar, PIN y copias de seguridad. */
export function SettingsDialog({ open, onClose, members, onMembersChanged, hasPin, onAuthChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const active = members.filter((m) => !m.archived);
  const archived = members.filter((m) => m.archived);

  // Ejecuta un cambio en los miembros: si falla se muestra el motivo, si sale bien se recarga.
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action();
      setError(null);
      await onMembersChanged();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (await run(() => window.api.members.create(newName))) setNewName("");
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (await run(() => window.api.members.rename(editing.id, editing.name))) setEditing(null);
  }

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setError(null);
        setEditing(null);
        onClose();
      }}
      onClick={(e) => {
        // Un clic en el fondo (el propio <dialog>, fuera del contenido) lo cierra.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="settings-title"
      className="m-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold">
            Configuración
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={smallButton}>
            ✕
          </button>
        </div>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium">Miembros del hogar</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sirven para indicar quién pagó o cobró cada movimiento. Todos ven toda la tesorería.
              {" "}
              {active.length} de {MAX_MEMBERS} activos.
            </p>
          </div>

          {active.length > 0 && (
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {active.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  {editing?.id === m.id ? (
                    <form onSubmit={handleRename} className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id: m.id, name: e.target.value })}
                        aria-label={`Nuevo nombre para ${m.name}`}
                        className={`${inputClass} min-w-0 flex-1`}
                      />
                      <button type="submit" className={smallButton}>
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setError(null);
                        }}
                        className={smallButton}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="truncate text-sm">{m.name}</span>
                      <span className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({ id: m.id, name: m.name });
                            setError(null);
                          }}
                          className={smallButton}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => window.api.members.setArchived(m.id, true))}
                          title="Deja de poder elegirse, pero sus movimientos conservan el nombre"
                          className={smallButton}
                        >
                          Archivar
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              placeholder="Nombre del nuevo miembro"
              aria-label="Nombre del nuevo miembro"
              maxLength={30}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={active.length >= MAX_MEMBERS || newName.trim() === ""}
              className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Añadir
            </button>
          </form>
          {active.length >= MAX_MEMBERS && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Llegaste al máximo de {MAX_MEMBERS} miembros activos. Archivá uno para añadir otro.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {archived.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400">
                Archivados ({archived.length})
              </summary>
              <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {archived.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-zinc-500 dark:text-zinc-400">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => run(() => window.api.members.setArchived(m.id, false))}
                      className={smallButton}
                    >
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <PinSettings hasPin={hasPin} onChanged={onAuthChanged} />

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <BackupSettings />
      </div>
    </dialog>
  );
}
