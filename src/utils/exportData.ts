import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** CSV con BOM UTF-8 — compatible con Excel en Windows. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const bom = '\uFEFF';
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadBlob(name, bom + lines, 'text/csv;charset=utf-8;');
}

export function downloadExcel<T extends Record<string, unknown>>(
  filename: string,
  sheetName: string,
  rows: T[]
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function downloadPdfTable(options: {
  filename: string;
  title: string;
  subtitle?: string;
  head: string[];
  body: (string | number)[][];
}) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(options.title, 14, 16);
  if (options.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 24);
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: options.subtitle ? 30 : 24,
    head: [options.head],
    body: options.body,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  doc.save(options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`);
}

export function rowsFromObjects<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
) {
  return {
    headers: columns.map((c) => c.label),
    rows: data.map((item) => columns.map((c) => item[c.key] ?? '')),
    objects: data,
  };
}
