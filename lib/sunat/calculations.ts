import type { SunatAmounts } from "./types.js";

export const IGV_RATE = 0.18;
export const BOLETA_DNI_REQUIRED_FROM = 700;

export function calculateAmountsFromTotal(total: number, igvRate = IGV_RATE): SunatAmounts {
  const taxableAmount = round2(total / (1 + igvRate));
  const igv = round2(total - taxableAmount);
  return { taxableAmount, igv, total: round2(total), igvRate };
}

export function calculateLineSubtotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCorrelativo(n: number): string {
  return String(n).padStart(8, "0");
}

export function buildFullNumber(series: string, correlativo: number): string {
  return `${series}-${formatCorrelativo(correlativo)}`;
}

export function getDenomination(type: "Boleta" | "Factura"): string {
  return type === "Boleta" ? "Boleta de Venta Electrónica" : "Factura Electrónica";
}
