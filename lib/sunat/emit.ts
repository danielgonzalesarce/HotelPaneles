import type { ElectronicInvoicePayload, SunatEmitResult } from "./types.js";
import { validateElectronicInvoice } from "./validation.js";
import { emitDemo } from "./providers/demo.js";
import { emitNubefact } from "./providers/nubefact.js";
import { isSunatSimulation, resolveSunatProvider } from "./config.js";

export async function emitElectronicDocument(
  payload: ElectronicInvoicePayload
): Promise<SunatEmitResult> {
  const simulation = isSunatSimulation();
  const issues = validateElectronicInvoice(payload, { simulation });
  if (issues.length > 0) {
    return {
      success: false,
      status: "rechazado",
      message: issues.map((i) => i.message).join(" "),
      provider: resolveSunatProvider(),
    };
  }

  const provider = resolveSunatProvider();

  switch (provider) {
    case "nubefact":
      return emitNubefact(payload);
    case "demo":
    default:
      return emitDemo(payload);
  }
}

export { validateElectronicInvoice, validateIssuer } from "./validation.js";
export {
  calculateAmountsFromTotal,
  buildFullNumber,
  getDenomination,
  formatCorrelativo,
  IGV_RATE,
  BOLETA_DNI_REQUIRED_FROM,
} from "./calculations.js";
export type * from "./types.js";
