export type InvoiceType = "Boleta" | "Factura";
export type ClientDocumentType = "DNI" | "CE" | "Pasaporte" | "RUC";
export type PaymentMethod = "Contado" | "Credito";
export type SunatStatus = "borrador" | "simulado" | "aceptado" | "rechazado" | "pendiente";

export interface InvoiceLineItem {
  quantity: number;
  description: string;
  unitPrice: number;
  subtotal: number;
}

export interface SunatIssuer {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal: string;
  esEmisorElectronico: boolean;
  boletaSeries: string;
  facturaSeries: string;
}

export interface SunatCustomer {
  name: string;
  documentType: ClientDocumentType;
  documentNumber: string;
  address?: string;
}

export interface SunatPayment {
  method: PaymentMethod;
  creditPendingAmount?: number;
}

export interface SunatAmounts {
  taxableAmount: number;
  igv: number;
  total: number;
  igvRate: number;
}

export interface ElectronicInvoicePayload {
  id: string;
  reservationId: string;
  type: InvoiceType;
  series: string;
  correlativo: number;
  fullNumber: string;
  denomination: string;
  emissionDate: string;
  emissionTime: string;
  issuer: SunatIssuer;
  customer: SunatCustomer;
  payment: SunatPayment;
  amounts: SunatAmounts;
  lines: InvoiceLineItem[];
  roomNumber: string;
  checkIn: string;
  checkOut: string;
}

export interface SunatEmitResult {
  success: boolean;
  status: SunatStatus;
  message: string;
  hash?: string;
  qrContent?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  provider: string;
  raw?: unknown;
}
