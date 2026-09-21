import { describe, expect, it } from "vitest";
import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  it("removes the Electron IPC prefix and keeps only the message", () => {
    const error = new Error("Error invoking remote method 'members:create': Error: Ya existe un miembro.");
    expect(errorMessage(error)).toBe("Ya existe un miembro.");
  });

  it("returns ordinary error messages untouched", () => {
    expect(errorMessage(new Error("Algo falló"))).toBe("Algo falló");
  });

  it("falls back to a generic message for non-errors", () => {
    expect(errorMessage("boom")).toBe("Ocurrió un error inesperado.");
    expect(errorMessage(undefined)).toBe("Ocurrió un error inesperado.");
  });
});
