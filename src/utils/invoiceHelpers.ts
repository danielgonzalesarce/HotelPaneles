import type { ElectronicInvoicePayload, SunatEmitResult } from "../../lib/sunat/types.js";
import {
  calculateAmountsFromTotal,
  buildFullNumber,
  getDenomination,
  round2,
  BOLETA_DNI_REQUIRED_FROM,
} from "../../lib/sunat/calculations.js";
import type {
  ClientDocumentType,
  HotelConfig,
  Invoice,
  InvoiceType,
  PaymentMethod,
  Reservation,
  Tenant,
  GlobalConfig,
} from "../types";

export function normalizeInvoice(raw: Partial<Invoice> & { id: string }): Invoice {
  const total = Number(raw.total ?? raw.subtotal ?? 0);
  const taxableAmount = Number(raw.taxableAmount ?? raw.subtotal ?? total);
  const igv = Number(raw.igv ?? 0);

  return {
    id: raw.id,
    reservationId: raw.reservationId ?? "",
    type: raw.type ?? "Boleta",
    series: raw.series ?? "B001",
    correlativo: raw.correlativo ?? 1,
    fullNumber: raw.fullNumber ?? raw.id,
    denomination: raw.denomination ?? "Boleta de Venta Electrónica",
    emissionDate: raw.emissionDate ?? raw.date ?? new Date().toISOString().slice(0, 10),
    emissionTime: raw.emissionTime,
    clientName: raw.clientName ?? "",
    clientDocument: raw.clientDocument ?? "",
    clientDocumentType: raw.clientDocumentType ?? "DNI",
    clientAddress: raw.clientAddress,
    paymentMethod: raw.paymentMethod ?? "Contado",
    creditPendingAmount: raw.creditPendingAmount,
    roomNumber: raw.roomNumber ?? "",
    checkIn: raw.checkIn ?? "",
    checkOut: raw.checkOut ?? "",
    taxableAmount,
    igv,
    subtotal: Number(raw.subtotal ?? taxableAmount),
    extras: raw.extras ?? [],
    total,
    igvRate: raw.igvRate ?? 0.18,
    lines: raw.lines ?? [],
    sunatStatus: raw.sunatStatus ?? "borrador",
    sunatMessage: raw.sunatMessage,
    sunatHash: raw.sunatHash,
    sunatQr: raw.sunatQr,
    sunatPdfUrl: raw.sunatPdfUrl,
    sunatXmlUrl: raw.sunatXmlUrl,
    date: raw.date ?? raw.emissionDate ?? new Date().toISOString().slice(0, 10),
  };
}

export function getDefaultSeries(type: InvoiceType, config: HotelConfig): string {
  return type === "Factura"
    ? config.fiscal?.facturaSeries || "F001"
    : config.fiscal?.boletaSeries || "B001";
}

export function getNextCorrelativo(
  invoices: Invoice[],
  type: InvoiceType,
  config: HotelConfig,
  seriesOverride?: string
) {
  const series = (seriesOverride || getDefaultSeries(type, config)).toUpperCase().slice(0, 4);
  const max = invoices
    .filter((i) => i.series === series)
    .reduce((m, i) => Math.max(m, i.correlativo || 0), 0);
  return { series, correlativo: max + 1 };
}

export interface InvoiceFormInput {
  type: InvoiceType;
  series?: string;
  clientName: string;
  clientDocument: string;
  clientDocumentType: ClientDocumentType;
  clientAddress?: string;
  paymentMethod: PaymentMethod;
  creditPendingAmount?: number;
}

function countNights(checkIn: string, checkOut: string): number {
  return Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

export function buildElectronicPayload(
  reservation: Reservation,
  config: HotelConfig,
  form: InvoiceFormInput,
  existingInvoices: Invoice[]
): ElectronicInvoicePayload {
  const { series, correlativo } = getNextCorrelativo(
    existingInvoices,
    form.type,
    config,
    form.series
  );
  const amounts = calculateAmountsFromTotal(reservation.totalPrice);
  const now = new Date();
  const nights = countNights(reservation.checkIn, reservation.checkOut);
  const unitPrice = round2(amounts.taxableAmount / nights);
  const fiscal = config.fiscal ?? {
    ruc: "",
    razonSocial: config.name,
    nombreComercial: config.name,
    domicilioFiscal: config.address,
    esEmisorElectronico: false,
    boletaSeries: "B001",
    facturaSeries: "F001",
  };

  return {
    id: buildFullNumber(series, correlativo),
    reservationId: reservation.id,
    type: form.type,
    series,
    correlativo,
    fullNumber: buildFullNumber(series, correlativo),
    denomination: getDenomination(form.type),
    emissionDate: now.toISOString().slice(0, 10),
    emissionTime: now.toTimeString().slice(0, 8),
    issuer: {
      ruc: fiscal.ruc,
      razonSocial: fiscal.razonSocial,
      nombreComercial: fiscal.nombreComercial ?? config.name,
      domicilioFiscal: fiscal.domicilioFiscal,
      esEmisorElectronico: fiscal.esEmisorElectronico,
      boletaSeries: fiscal.boletaSeries,
      facturaSeries: fiscal.facturaSeries,
    },
    customer: {
      name: form.clientName,
      documentType: form.clientDocumentType,
      documentNumber: form.clientDocument,
      address: form.clientAddress,
    },
    payment: {
      method: form.paymentMethod,
      creditPendingAmount: form.creditPendingAmount,
    },
    amounts,
    lines: [
      {
        quantity: nights,
        description: `Hospedaje ${reservation.roomName} (${reservation.checkIn} al ${reservation.checkOut})`,
        unitPrice,
        subtotal: amounts.taxableAmount,
      },
    ],
    roomNumber: reservation.roomName,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
  };
}

export function payloadToInvoice(
  payload: ElectronicInvoicePayload,
  sunatResult: SunatEmitResult
): Invoice {
  return normalizeInvoice({
    id: payload.fullNumber,
    reservationId: payload.reservationId,
    type: payload.type,
    series: payload.series,
    correlativo: payload.correlativo,
    fullNumber: payload.fullNumber,
    denomination: payload.denomination,
    emissionDate: payload.emissionDate,
    emissionTime: payload.emissionTime,
    clientName: payload.customer.name,
    clientDocument: payload.customer.documentNumber,
    clientDocumentType: payload.customer.documentType,
    clientAddress: payload.customer.address,
    paymentMethod: payload.payment.method,
    creditPendingAmount: payload.payment.creditPendingAmount,
    roomNumber: payload.roomNumber,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    taxableAmount: payload.amounts.taxableAmount,
    igv: payload.amounts.igv,
    subtotal: payload.amounts.taxableAmount,
    extras: [],
    total: payload.amounts.total,
    igvRate: payload.amounts.igvRate,
    lines: payload.lines,
    sunatStatus: sunatResult.status,
    sunatMessage: sunatResult.message,
    sunatHash: sunatResult.hash,
    sunatQr: sunatResult.qrContent,
    sunatPdfUrl: sunatResult.pdfUrl,
    sunatXmlUrl: sunatResult.xmlUrl,
    date: payload.emissionDate,
  });
}

export { BOLETA_DNI_REQUIRED_FROM };

export function globalConfigToHotelConfig(global: GlobalConfig): HotelConfig {
  return {
    name: global.platformName,
    address: global.platformAddress || global.fiscal?.domicilioFiscal || '',
    phone: global.supportPhone,
    email: global.supportEmail,
    whatsapp: global.supportPhone.replace(/\D/g, ''),
    fiscal: global.fiscal,
  };
}

export function buildTenantElectronicPayload(
  tenant: Tenant,
  amount: number,
  globalConfig: GlobalConfig,
  form: InvoiceFormInput,
  existingInvoices: Invoice[]
): ElectronicInvoicePayload {
  const issuerConfig = globalConfigToHotelConfig(globalConfig);
  const { series, correlativo } = getNextCorrelativo(
    existingInvoices,
    form.type,
    issuerConfig,
    form.series
  );
  const amounts = calculateAmountsFromTotal(amount);
  const now = new Date();
  const fiscal = globalConfig.fiscal ?? {
    ruc: '',
    razonSocial: globalConfig.platformName,
    nombreComercial: globalConfig.platformName,
    domicilioFiscal: globalConfig.platformAddress || '',
    esEmisorElectronico: true,
    boletaSeries: 'B001',
    facturaSeries: 'F001',
  };

  return {
    id: buildFullNumber(series, correlativo),
    reservationId: tenant.id,
    type: form.type,
    series,
    correlativo,
    fullNumber: buildFullNumber(series, correlativo),
    denomination: getDenomination(form.type),
    emissionDate: now.toISOString().slice(0, 10),
    emissionTime: now.toTimeString().slice(0, 8),
    issuer: {
      ruc: fiscal.ruc,
      razonSocial: fiscal.razonSocial,
      nombreComercial: fiscal.nombreComercial ?? globalConfig.platformName,
      domicilioFiscal: fiscal.domicilioFiscal,
      esEmisorElectronico: fiscal.esEmisorElectronico,
      boletaSeries: fiscal.boletaSeries,
      facturaSeries: fiscal.facturaSeries,
    },
    customer: {
      name: form.clientName,
      documentType: form.clientDocumentType,
      documentNumber: form.clientDocument,
      address: form.clientAddress,
    },
    payment: {
      method: form.paymentMethod,
      creditPendingAmount: form.creditPendingAmount,
    },
    amounts,
    lines: [
      {
        quantity: 1,
        description: `Suscripción SaaS Plan ${tenant.plan} · ${tenant.name}`,
        unitPrice: amounts.taxableAmount,
        subtotal: amounts.taxableAmount,
      },
    ],
    roomNumber: `Plan ${tenant.plan}`,
    checkIn: now.toISOString().slice(0, 10),
    checkOut: now.toISOString().slice(0, 10),
  };
}
