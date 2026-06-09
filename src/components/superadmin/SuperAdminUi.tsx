import React from 'react';
import { Link } from 'react-router-dom';

export {
  AppModal,
  FormSection,
  FormField,
  ModalActions,
  PlanPermissionsPreview,
  SimulationBadge,
  formInputClass,
  formSelectClass,
  formTextareaClass,
  formHintClass,
  modalScrollClass,
} from '../ui/Modal';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SuperAdminPageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-3 rounded-2xl ${tones[tone]} mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-slate-500 text-sm font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-[2rem] border border-dashed border-slate-200">
      <p className="text-lg font-bold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
