import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  onCsv?: () => void;
  onExcel?: () => void;
  onPdf?: () => void;
  compact?: boolean;
}

export default function ExportButtons({ onCsv, onExcel, onPdf, compact }: ExportButtonsProps) {
  const btn = compact
    ? 'flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all'
    : 'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all';

  return (
    <div className="flex flex-wrap gap-2">
      {onCsv && (
        <button
          type="button"
          onClick={onCsv}
          className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
          title="Descargar CSV"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      )}
      {onExcel && (
        <button
          type="button"
          onClick={onExcel}
          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          title="Descargar Excel"
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </button>
      )}
      {onPdf && (
        <button
          type="button"
          onClick={onPdf}
          className={`${btn} bg-rose-50 text-rose-600 hover:bg-rose-100`}
          title="Descargar PDF"
        >
          <FileText className="h-4 w-4" /> PDF
        </button>
      )}
    </div>
  );
}
