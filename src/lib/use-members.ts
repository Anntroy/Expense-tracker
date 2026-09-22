"use client";

import { useCallback, useEffect, useState } from "react";
import type { Member } from "./types";

/** Miembros del hogar (activos y archivados). `refresh` vuelve a pedirlos tras un cambio. */
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.api) return;
    setMembers(await window.api.members.list());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.api) return;
    let cancelled = false;
    window.api.members.list().then((list) => {
      if (!cancelled) setMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { members, refresh };
}
