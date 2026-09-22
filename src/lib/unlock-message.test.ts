import { describe, expect, it } from "vitest";
import { wrongPinMessage } from "./unlock-message";

describe("wrongPinMessage", () => {
  it("uses the plural for several attempts left", () => {
    expect(wrongPinMessage(4)).toBe("PIN incorrecto. Quedan 4 intentos antes de una espera.");
    expect(wrongPinMessage(2)).toBe("PIN incorrecto. Quedan 2 intentos antes de una espera.");
  });

  it("uses the singular for the last attempt", () => {
    expect(wrongPinMessage(1)).toBe("PIN incorrecto. Queda 1 intento antes de una espera.");
  });
});
