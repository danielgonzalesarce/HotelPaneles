import type { ElectronicInvoicePayload, SunatEmitResult } from "../../lib/sunat/types.js";

export async function emitSunatComprobante(
  payload: ElectronicInvoicePayload
): Promise<SunatEmitResult & { validationErrors?: string[] }> {
  const response = await fetch("/api/sunat/emit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice: payload }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Error al emitir comprobante SUNAT");
  }
  return data;
}

export async function getSunatStatus(): Promise<{
  provider: string;
  simulation?: boolean;
  configured: boolean;
  ruc?: string;
  label?: string;
}> {
  const response = await fetch("/api/sunat/status");
  if (!response.ok) return { provider: "demo", simulation: true, configured: true };
  return response.json();
}
