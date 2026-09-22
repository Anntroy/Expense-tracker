/**
 * Texto legible de un error. Los errores que lanza el proceso principal llegan al
 * renderer como "Error invoking remote method 'canal': Error: mensaje"; se deja solo el mensaje.
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Ocurrió un error inesperado.";
  return error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, "");
}
