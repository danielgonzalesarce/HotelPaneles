import React from 'react';
import { Search } from 'lucide-react';
import { formInputClass } from './Modal';

export const panelSearchClass = `${formInputClass} pl-10`;

export function PanelPageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function PanelStatCard({
  label,
  value,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
  };
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-2.5 rounded-xl ${tones[tone]} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl md:text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function PanelEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-200">
      <p className="text-base font-bold text-slate-800">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PanelSearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={panelSearchClass}
      />
    </div>
  );
}

export function PanelCard({
  children,
  className = '',
  padding = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md';
}) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5 md:p-6';
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${pad} ${className}`}>
      {children}
    </div>
  );
}

export function PanelSessionCard({
  name,
  email,
  meta,
  avatarLetter,
  dark = false,
}: {
  name: string;
  email: string;
  meta?: string;
  avatarLetter?: string;
  dark?: boolean;
}) {
  const letter = avatarLetter ?? name.charAt(0).toUpperCase();
  if (dark) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-slate-800/80 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {letter}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Sesión</div>
            <div className="font-semibold text-sm truncate text-white">{name}</div>
            <div className="text-xs text-indigo-300 truncate">{email}</div>
            {meta && (
              <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-indigo-500/25 text-indigo-200 text-[10px] font-bold uppercase">
                {meta}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {letter}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate text-slate-900">{name}</div>
          <div className="text-xs text-slate-500 truncate">{email}</div>
          {meta && (
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">
              {meta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
      Plan {plan}
    </span>
  );
}
