import { describe, expect, it } from "vitest";
import { validateRucLocally } from "../../lib/ruc/validate.js";

describe("validateRucLocally", () => {
  it("acepta RUC persona natural activo", () => {
    const result = validateRucLocally("10743646881");
    expect(result.valid).toBe(true);
    expect(result.status).toBe("activo");
    expect(result.razonSocial).toBeTruthy();
  });

  it("rechaza RUC inactivo simulado", () => {
    const result = validateRucLocally("20123456700");
    expect(result.valid).toBe(false);
    expect(result.status).toBe("inactivo");
  });
});
