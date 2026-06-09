import type { ElectronicInvoicePayload, SunatEmitResult } from "../types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round10(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}

function mapNubefactItem(
  line: ElectronicInvoicePayload["lines"][number],
  igvRate: number
) {
  const qty = line.quantity;
  const totalConIgv = round2(line.subtotal * (1 + igvRate));
  const precioUnitario = round2(totalConIgv / qty);
  const valorUnitario = round10(precioUnitario / (1 + igvRate));
  const subtotal = round2(valorUnitario * qty);
  const igv = round2(subtotal * igvRate);
  const total = round2(subtotal + igv);

  return {
    unidad_de_medida: "NIU",
    codigo: "HAB",
    descripcion: line.description,
    cantidad: qty,
    valor_unitario: valorUnitario,
    precio_unitario: precioUnitario,
    subtotal,
    tipo_de_igv: 1,
    igv,
    total,
  };
}

/** Mapeo documento cliente → código Nubefact */
function docTypeCode(type: ElectronicInvoicePayload["customer"]["documentType"]): number {
  switch (type) {
    case "DNI":
      return 1;
    case "CE":
      return 4;
    case "Pasaporte":
      return 7;
    case "RUC":
      return 6;
    default:
      return 1;
  }
}

function formatEmissionDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

export async function emitNubefact(payload: ElectronicInvoicePayload): Promise<SunatEmitResult> {
  const token = process.env.NUBEFACT_TOKEN;
  const ruta =
    process.env.NUBEFACT_API_URL?.replace(/\/$/, "") ||
    (process.env.SUNAT_RUC
      ? `https://api.nubefact.com/api/v1/${process.env.SUNAT_RUC}`
      : "");

  if (!ruta) {
    return {
      success: false,
      status: "rechazado",
      message: "NUBEFACT_API_URL (RUTA del panel) no configurada en el servidor.",
      provider: "nubefact",
    };
  }

  if (!token) {
    return {
      success: false,
      status: "rechazado",
      message: "NUBEFACT_TOKEN no configurado en el servidor.",
      provider: "nubefact",
    };
  }

  const tipoComprobante = payload.type === "Factura" ? 1 : 2;
  const body = {
    operacion: "generar_comprobante",
    tipo_de_comprobante: tipoComprobante,
    serie: payload.series,
    numero: payload.correlativo,
    sunat_transaction: 1,
    enviar_automaticamente_a_la_sunat: true,
    cliente_tipo_de_documento: docTypeCode(payload.customer.documentType),
    cliente_numero_de_documento: payload.customer.documentNumber,
    cliente_denominacion: payload.customer.name,
    cliente_direccion: payload.customer.address || payload.issuer.domicilioFiscal,
    fecha_de_emision: formatEmissionDate(payload.emissionDate),
    moneda: 1,
    porcentaje_de_igv: 18,
    total_gravada: payload.amounts.taxableAmount,
    total_igv: payload.amounts.igv,
    total: payload.amounts.total,
    forma_de_pago: payload.payment.method === "Contado" ? "Contado" : "Credito",
    monto_credito:
      payload.payment.method === "Credito" ? payload.payment.creditPendingAmount : undefined,
    items: payload.lines.map((line) => mapNubefactItem(line, payload.amounts.igvRate)),
  };

  const response = await fetch(ruta, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token token="${token}"`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok || data.errors) {
    const errMsg =
      typeof data.errors === "string"
        ? data.errors
        : JSON.stringify(data.errors ?? data.cadena_para_codigo_qr ?? "Error Nubefact");
    return {
      success: false,
      status: "rechazado",
      message: String(errMsg),
      provider: "nubefact",
      raw: data,
    };
  }

  return {
    success: true,
    status: "aceptado",
    message: "Comprobante aceptado por SUNAT vía Nubefact.",
    hash: String(data.hash ?? data.codigo_hash ?? ""),
    qrContent: String(data.cadena_para_codigo_qr ?? ""),
    pdfUrl: data.enlace_del_pdf ? String(data.enlace_del_pdf) : undefined,
    xmlUrl: data.enlace_del_xml ? String(data.enlace_del_xml) : undefined,
    provider: "nubefact",
    raw: data,
  };
}
