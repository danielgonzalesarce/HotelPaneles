import React from 'react';

export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
        <span className="text-sm font-medium">Cargando…</span>
      </div>
    </div>
  );
}
