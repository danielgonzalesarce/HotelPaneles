import type { ElectronicInvoicePayload, SunatIssuer } from "./types.js";
import { BOLETA_DNI_REQUIRED_FROM } from "./calculations.js";

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateIssuer(
  issuer: Partial<SunatIssuer>,
  options?: { simulation?: boolean }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!issuer.ruc?.trim()) issues.push({ field: "ruc", message: "RUC del emisor es obligatorio." });
  else if (!/^\d{11}$/.test(issuer.ruc.trim())) {
    issues.push({ field: "ruc", message: "El RUC debe tener 11 dígitos." });
  }
  if (!issuer.razonSocial?.trim()) {
    issues.push({ field: "razonSocial", message: "Razón social del emisor es obligatoria." });
  }
  if (!issuer.domicilioFiscal?.trim()) {
    issues.push({ field: "domicilioFiscal", message: "Domicilio fiscal es obligatorio." });
  }
  if (!options?.simulation && !issuer.esEmisorElectronico) {
    issues.push({
      field: "esEmisorElectronico",
      message: "Debe estar habilitado como emisor electrónico ante SUNAT.",
    });
  }
  return issues;
}

export function validateElectronicInvoice(
  payload: ElectronicInvoicePayload,
  options?: { simulation?: boolean }
): ValidationIssue[] {
  const issues = validateIssuer(payload.issuer, options);

  if (!payload.customer.name?.trim()) {
    issues.push({ field: "customer.name", message: "Nombre del cliente es obligatorio." });
  }

  if (payload.type === "Boleta") {
    if (payload.amounts.total > BOLETA_DNI_REQUIRED_FROM) {
      if (!payload.customer.documentNumber?.trim()) {
        issues.push({
          field: "customer.documentNumber",
          message: `Boleta mayor a S/ ${BOLETA_DNI_REQUIRED_FROM}: DNI u otro documento es obligatorio.`,
        });
      }
    }
    if (payload.customer.documentType === "RUC") {
      issues.push({
        field: "customer.documentType",
        message: "La boleta es para consumidor final; use Factura si el cliente tiene RUC.",
      });
    }
  }

  if (payload.type === "Factura") {
    if (payload.customer.documentType !== "RUC" || !/^\d{11}$/.test(payload.customer.documentNumber)) {
      issues.push({
        field: "customer.documentNumber",
        message: "Factura electrónica: RUC activo de 11 dígitos es obligatorio.",
      });
    }
    if (!payload.customer.address?.trim()) {
      issues.push({
        field: "customer.address",
        message: "Factura electrónica: dirección completa del comprador es obligatoria.",
      });
    }
    if (payload.payment.method === "Credito") {
      if (
        payload.payment.creditPendingAmount == null ||
        payload.payment.creditPendingAmount <= 0
      ) {
        issues.push({
          field: "payment.creditPendingAmount",
          message: "Indique el monto neto pendiente de pago (crédito).",
        });
      }
    }
  }

  if (payload.lines.length === 0) {
    issues.push({ field: "lines", message: "Debe incluir al menos un ítem en el detalle." });
  }

  return issues;
}
