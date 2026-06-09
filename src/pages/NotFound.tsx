import { Link, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center space-y-6">
        <p className="text-7xl font-black text-stone-200">404</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Página no encontrada</h1>
        <p className="text-slate-500 leading-relaxed">
          La ruta que busca no existe. Puede volver al inicio o consultar con nuestro concierge.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-black transition-colors"
          >
            <Home className="h-4 w-4" />
            Inicio
          </Link>
          <Link
            to="/?chat=open"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-4 w-4" />
            Concierge
          </Link>
        </div>
      </div>
    </div>
  );
}
