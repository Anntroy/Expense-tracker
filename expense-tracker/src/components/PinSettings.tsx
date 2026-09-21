"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/error-message";
import { PinSchema } from "@/lib/schema";

type Props = {
  hasPin: boolean;
  /** Se llama tras activar, cambiar o quitar el PIN. */
  onChanged: () => void | Promise<void>;
};

type Mode = "idle" | "set" | "change" | "remove";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const primaryButton =
  "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";
const secondaryButton =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

/** Sección "Seguridad" de Configuración: activar, cambiar o quitar el PIN de bloqueo. */
export function PinSettings({ hasPin, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function start(nextMode: Mode) {
    setMode(nextMode);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setDone(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode !== "remove") {
      const parsed = PinSchema.safeParse(next);
      if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "PIN inválido.");
      if (next !== confirm) return setError("Los dos PIN no coinciden.");
    }

    try {
      if (mode === "set") await window.api.auth.setPin(next);
      else if (mode === "change") await window.api.auth.setPin(next, current);
      else await window.api.auth.removePin(current);
      setDone(mode === "set" ? "PIN activado." : mode === "change" ? "PIN cambiado." : "PIN quitado.");
      setMode("idle");
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const digits = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/\D/g, ""));
    setError(null);
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Seguridad</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Un PIN de 4 a 8 dígitos que se pide al abrir la app. Protege la app, pero no cifra el
          archivo de datos. Si lo olvidas no se puede recuperar desde la app.
        </p>
      </div>

      {mode === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          {hasPin ? (
            <>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">PIN activado</span>
              <button type="button" onClick={() => start("change")} className={secondaryButton}>
                Cambiar PIN
              </button>
              <button type="button" onClick={() => start("remove")} className={secondaryButton}>
                Quitar PIN
              </button>
            </>
          ) : (
            <button type="button" onClick={() => start("set")} className={secondaryButton}>
              Activar PIN
            </button>
          )}
        </div>
      )}

      {mode !== "idle" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {(mode === "change" || mode === "remove") && (
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={current}
              onChange={digits(setCurrent)}
              placeholder="PIN actual"
              aria-label="PIN actual"
              className={inputClass}
            />
          )}
          {mode !== "remove" && (
            <>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={next}
                onChange={digits(setNext)}
                placeholder="PIN nuevo (4 a 8 dígitos)"
                aria-label="PIN nuevo"
                className={inputClass}
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={confirm}
                onChange={digits(setConfirm)}
                placeholder="Repite el PIN nuevo"
                aria-label="Repite el PIN nuevo"
                className={inputClass}
              />
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className={primaryButton}>
              {mode === "remove" ? "Quitar PIN" : mode === "change" ? "Cambiar PIN" : "Activar PIN"}
            </button>
            <button type="button" onClick={() => start("idle")} className={secondaryButton}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
    </section>
  );
}
