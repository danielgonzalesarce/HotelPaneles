import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { HotelConfig, Invoice } from "../types";
import { formatCurrency } from "../lib/utils";

export function generateElectronicInvoicePdf(invoice: Invoice, config: HotelConfig): jsPDF {
  const doc = new jsPDF();
  const issuer = config.fiscal;
  const left = 14;
  let y = 16;

  if (config.logo?.startsWith("data:image")) {
    try {
      const format = config.logo.split(";")[0].split("/")[1]?.toUpperCase();
      doc.addImage(config.logo, format === "PNG" ? "PNG" : "JPEG", left, 10, 28, 28);
    } catch {
      /* ignore */
    }
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(issuer?.razonSocial || config.name, 46, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (issuer?.nombreComercial) {
    doc.text(`Nombre comercial: ${issuer.nombreComercial}`, 46, y);
    y += 4;
  }
  doc.text(`RUC: ${issuer?.ruc || "—"}`, 46, y);
  y += 4;
  doc.text(`Domicilio fiscal: ${issuer?.domicilioFiscal || config.address}`, 46, y);
  y += 4;
  doc.text(
    `Condición: ${issuer?.esEmisorElectronico ? "Emisor electrónico" : "Pendiente de habilitación"}`,
    46,
    y
  );
  y += 8;

  doc.setDrawColor(200);
  doc.line(left, y, 196, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(invoice.denomination || `${invoice.type} Electrónica`, left, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`Serie-Número: ${invoice.fullNumber || invoice.id}`, left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Fecha de emisión: ${invoice.emissionDate || invoice.date}${invoice.emissionTime ? ` ${invoice.emissionTime}` : ""}`,
    left,
    y
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL ADQUIRIENTE", left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre / Razón social: ${invoice.clientName}`, left, y);
  y += 4;
  doc.text(
    `Documento (${invoice.clientDocumentType || "DOC"}): ${invoice.clientDocument || "—"}`,
    left,
    y
  );
  if (invoice.type === "Factura" && invoice.clientAddress) {
    y += 4;
    doc.text(`Dirección: ${invoice.clientAddress}`, left, y);
  }
  y += 4;
  doc.text(
    `Forma de pago: ${invoice.paymentMethod || "Contado"}${
      invoice.paymentMethod === "Credito" && invoice.creditPendingAmount
        ? ` · Pendiente: ${formatCurrency(invoice.creditPendingAmount)}`
        : ""
    }`,
    left,
    y
  );
  y += 8;

  const lines = invoice.lines?.length
    ? invoice.lines
    : [
        {
          quantity: 1,
          description: `Hospedaje - ${invoice.roomNumber} (${invoice.checkIn} al ${invoice.checkOut})`,
          unitPrice: invoice.taxableAmount ?? invoice.subtotal,
          subtotal: invoice.taxableAmount ?? invoice.subtotal,
        },
      ];

  autoTable(doc, {
    startY: y,
    head: [["Cant.", "Descripción", "P. unit.", "Subtotal"]],
    body: lines.map((l) => [
      String(l.quantity),
      l.description,
      formatCurrency(l.unitPrice),
      formatCurrency(l.subtotal),
    ]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
  });

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const taxable = invoice.taxableAmount ?? invoice.subtotal;
  const igv = invoice.igv ?? 0;

  doc.setFontSize(10);
  doc.text(`Valor venta (gravado): ${formatCurrency(taxable)}`, 120, finalY);
  doc.text(`IGV (18%): ${formatCurrency(igv)}`, 120, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.text(`Importe total: ${formatCurrency(invoice.total)}`, 120, finalY + 12);

  if (invoice.sunatHash) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Hash SUNAT: ${invoice.sunatHash}`, left, finalY + 22);
  }
  if (invoice.sunatStatus) {
    doc.text(`Estado SUNAT: ${invoice.sunatStatus}`, left, finalY + 28);
  }

  return doc;
}
