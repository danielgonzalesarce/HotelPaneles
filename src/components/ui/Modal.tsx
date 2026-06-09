import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export const formInputClass =
  'w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-slate-500';

export const formSelectClass = formInputClass;

export const formTextareaClass =
  'w-full min-h-[88px] px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 resize-y';

export const formHintClass = 'text-xs text-slate-500 mt-1';

export const modalScrollClass =
  'overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80';

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  badge,
  size = 'md',
  footer,
  children,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-lg' : 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={`relative flex flex-col w-full ${widthClass} max-h-[92vh] sm:max-h-[min(88vh,780px)] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/80`}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 bg-white rounded-t-2xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 id="app-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`flex-1 min-h-0 px-5 sm:px-6 py-5 ${modalScrollClass}`}>{children}</div>

        {footer && (
          <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  accent = 'indigo',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: 'indigo' | 'slate' | 'emerald' | 'amber';
}) {
  const accentBorder = {
    indigo: 'border-indigo-500',
    slate: 'border-slate-400',
    emerald: 'border-emerald-500',
    amber: 'border-amber-500',
  }[accent];

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
      <div className={`px-4 py-3 border-l-4 ${accentBorder} bg-white border-b border-slate-100`}>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className={formHintClass}>{hint}</p>}
    </div>
  );
}

export function ModalActions({
  onCancel,
  cancelLabel = 'Cancelar',
  submitLabel,
  submitType = 'submit',
  onSubmit,
  loading,
  disabled,
  submitForm,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  submitType?: 'button' | 'submit';
  onSubmit?: () => void;
  loading?: boolean;
  disabled?: boolean;
  submitForm?: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="w-full sm:w-auto px-5 h-10 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type={submitType}
        form={submitForm}
        onClick={onSubmit}
        disabled={disabled || loading}
        className="w-full sm:w-auto px-5 h-10 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20"
      >
        {loading ? 'Procesando…' : submitLabel}
      </button>
    </>
  );
}

export function SimulationBadge({ label = 'Simulación' }: { label?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200/80">
      {label}
    </span>
  );
}

export function PlanPermissionsPreview({ lines }: { lines: string[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {lines.map((line) => {
        const enabled = !line.includes(': No');
        return (
          <div
            key={line}
            className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-2 border ${
              enabled
                ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900'
                : 'bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            {enabled ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}
            <span className="leading-snug">{line}</span>
          </div>
        );
      })}
    </div>
  );
}
