/** Evita restos de punto flotante al sumar decimales (0.1 + 0.2). */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
