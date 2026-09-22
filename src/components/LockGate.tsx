"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LockScreen } from "@/components/LockScreen";
import type { AuthStatus } from "@/lib/types";

type Api = {
  /** Hay un PIN configurado. */
  hasPin: boolean;
  /** Bloquea la app ahora mismo. */
  lock: () => Promise<void>;
  /** Vuelve a leer el estado del bloqueo (tras activar, cambiar o quitar el PIN). */
  refreshAuth: () => Promise<void>;
};

/**
 * Muestra la pantalla de bloqueo mientras la app esté bloqueada y solo entonces
 * monta la app: sus componentes piden datos al arrancar, y estando bloqueada el
 * proceso principal los rechazaría. Sin `window.api` (navegador normal) deja pasar,
 * y las vistas muestran su propio aviso.
 */
export function LockGate({ children }: { children: (api: Api) => ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | "no-api" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load: Promise<AuthStatus | "no-api"> =
      typeof window !== "undefined" && window.api ? window.api.auth.status() : Promise.resolve("no-api");
    load.then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAuth = useCallback(async () => {
    if (typeof window === "undefined" || !window.api) return;
    setStatus(await window.api.auth.status());
  }, []);

  const lock = useCallback(async () => {
    await window.api.auth.lock();
    await refreshAuth();
  }, [refreshAuth]);

  if (status === null) {
    return <p className="p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }
  if (status !== "no-api" && status.hasPin && !status.unlocked) {
    return <LockScreen onUnlocked={refreshAuth} />;
  }
  return <>{children({ hasPin: status !== "no-api" && status.hasPin, lock, refreshAuth })}</>;
}
