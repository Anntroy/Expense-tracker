"use client";

import { useEffect, useState, type FormEvent } from "react";

type Props = {
  /** Se llama cuando el PIN fue correcto, para que la app se muestre. */
  onUnlocked: () => void | Promise<void>;
};

/** Pantalla de bloqueo: pide el PIN. Los intentos y la espera los controla el proceso principal. */
export function LockScreen({ onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  // Cuenta atrás mientras hay que esperar tras demasiados intentos.
  useEffect(() => {
    if (waitUntil === null) return;
    const tick = () => {
      const left = Math.ceil((waitUntil - Date.now()) / 1000);
      if (left <= 0) {
        setWaitUntil(null);
        setSecondsLeft(0);
        setMessage(null);
      } else {
        setSecondsLeft(left);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [waitUntil]);

  const waiting = waitUntil !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (waiting || busy || pin === "") return;
    setBusy(true);
    try {
      const result = await window.api.auth.unlock(pin);
      if (result.ok) {
        await onUnlocked();
        return;
      }
      setPin("");
      if (result.reason === "locked-out") {
        setMessage("Demasiados intentos.");
        setWaitUntil(Date.now() + result.retryAfterMs);
      } else {
        setMessage(
          `PIN incorrecto. ${result.attemptsLeft === 1 ? "Queda 1 intento" : `Quedan ${result.attemptsLeft} intentos`} antes de una espera.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tesorería bloqueada</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Introduce el PIN para continuar.</p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            if (!waiting) setMessage(null);
          }}
          disabled={waiting}
          aria-label="PIN"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-lg tracking-[0.4em] text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />

        {(message || waiting) && (
          <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
            {message}
            {waiting && ` Vuelve a intentarlo en ${secondsLeft} s.`}
          </p>
        )}

        <button
          type="submit"
          disabled={waiting || busy || pin === ""}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Desbloquear
        </button>
      </form>
    </div>
  );
}
