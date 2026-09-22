"use client";

import { AppShell } from "@/components/AppShell";
import { LockGate } from "@/components/LockGate";

export default function Home() {
  return (
    <LockGate>
      {({ hasPin, lock, refreshAuth }) => (
        <AppShell hasPin={hasPin} onLock={lock} onAuthChanged={refreshAuth} />
      )}
    </LockGate>
  );
}
