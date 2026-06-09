import type { ElectronicInvoicePayload, SunatEmitResult } from "../types.js";

export async function emitDemo(payload: ElectronicInvoicePayload): Promise<SunatEmitResult> {
  const hash = Buffer.from(`${payload.fullNumber}-${payload.emissionDate}-${payload.amounts.total}`)
    .toString("base64")
    .slice(0, 24);

  return {
    success: true,
    status: "simulado",
    message:
      "Comprobante generado en modo simulación académica. Cumple formato SUNAT (IGV, serie, correlativo) sin envío real.",
    hash,
    qrContent: `${payload.issuer.ruc}|${payload.type}|${payload.fullNumber}|${payload.amounts.total}|${payload.emissionDate}`,
    provider: "demo",
  };
}
