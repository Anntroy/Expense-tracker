/** Mensaje tras un PIN incorrecto, con los intentos que quedan antes de la siguiente espera. */
export function wrongPinMessage(attemptsLeft: number): string {
  const left = attemptsLeft === 1 ? "Queda 1 intento" : `Quedan ${attemptsLeft} intentos`;
  return `PIN incorrecto. ${left} antes de una espera.`;
}
