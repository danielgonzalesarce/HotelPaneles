import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Bed,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Reservation, User as UserType } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useToast } from '../context/ToastContext';
import {
  PanelPageHeader,
  PanelStatCard,
  PanelEmptyState,
  PanelSessionCard,
  PanelCard,
} from '../components/ui/PanelUi';
import { formInputClass, FormField, FormSection } from '../components/ui/Modal';

const USER_ROUTE_META: { match: (path: string) => boolean; title: string; subtitle?: string }[] = [
  { match: (p) => p === '/user' || p === '/user/', title: 'Mi panel', subtitle: 'Bienvenido de nuevo a Lumina Hotel & Spa.' },
  { match: (p) => p.startsWith('/user/mis-reservas'), title: 'Mis reservas', subtitle: 'Historial y gestión de estancias.' },
  { match: (p) => p.startsWith('/user/perfil'), title: 'Mi perfil', subtitle: 'Actualice sus datos de contacto.' },
];

function UserRouteHeader({ pathname }: { pathname: string }) {
  const meta = USER_ROUTE_META.find((r) => r.match(pathname));
  if (!meta) return null;
  return <PanelPageHeader title={meta.title} subtitle={meta.subtitle} />;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'user') {
      navigate('/login');
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (!currentUser) return null;

  const sidebarLinks = [
    { name: 'Dashboard', path: '/user', icon: LayoutDashboard, exact: true },
    { name: 'Mis reservas', path: '/user/mis-reservas', icon: Calendar },
    { name: 'Mi perfil', path: '/user/perfil', icon: User },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    storage.setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <Bed className="h-6 w-6" />
          <span>Lumina</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          aria-label="Menú"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 lg:fixed lg:h-screen overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 text-indigo-300 font-bold text-xl mb-6 lg:mb-8">
            <Bed className="h-8 w-8" />
            <div>
              <div>Área huésped</div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Lumina Hotel</div>
            </div>
          </div>
          <PanelSessionCard name={currentUser.name} email={currentUser.email} meta="Huésped Lumina" dark />
          <nav className="space-y-1 flex-1">
            {sidebarLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive(link.path, link.exact)
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-5 w-5" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-grow p-4 md:p-6 lg:p-8 lg:ml-64 min-h-screen">
        <UserRouteHeader pathname={location.pathname} />
        <Routes>
          <Route index element={<UserOverview user={currentUser} />} />
          <Route path="mis-reservas" element={<UserReservations user={currentUser} />} />
          <Route path="perfil" element={<UserProfile user={currentUser} />} />
        </Routes>
      </main>
    </div>
  );
}

function UserOverview({ user }: { user: UserType }) {
  const reservations = storage.getReservations().filter((r) => r.userId === user.id);
  const upcoming = reservations.filter((r) => r.status !== 'cancelled').slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PanelStatCard label="Total reservas" value={reservations.length} icon={Calendar} tone="indigo" />
        <PanelStatCard label="Próximas estancias" value={upcoming.length} icon={Bed} tone="emerald" />
        <PanelStatCard label="Nivel" value="Gold" icon={User} tone="amber" />
      </div>

      <PanelCard>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Próximas reservas</h3>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((res) => (
              <Link
                key={res.id}
                to="/user/mis-reservas"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-100">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{res.roomName}</div>
                    <div className="text-sm text-slate-500">
                      {res.checkIn} → {res.checkOut}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <PanelEmptyState
            title="Sin reservas próximas"
            description="Explore habitaciones y reserve su próxima estancia."
            action={
              <Link to="/habitaciones" className="inline-flex px-4 h-10 items-center bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
                Ver habitaciones
              </Link>
            }
          />
        )}
      </PanelCard>
    </div>
  );
}

function UserReservations({ user }: { user: UserType }) {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    setReservations(storage.getReservations().filter((r) => r.userId === user.id));
  }, [user.id]);

  const handleCancel = (id: string) => {
    if (confirm('¿Cancelar esta reserva?')) {
      storage.updateReservationStatus(id, 'cancelled');
      setReservations(storage.getReservations().filter((r) => r.userId === user.id));
      showToast('Reserva cancelada.');
    }
  };

  return (
    <PanelCard padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-3">Habitación</th>
              <th className="px-5 py-3">Fechas</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reservations.map((res) => (
              <tr key={res.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-4 font-semibold text-slate-900">{res.roomName}</td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {res.checkIn}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> {res.checkOut}
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold text-indigo-600">{formatCurrency(res.totalPrice)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      res.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : res.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {res.status === 'confirmed' && <CheckCircle className="h-3 w-3" />}
                    {res.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                    {res.status === 'pending' && <Clock className="h-3 w-3" />}
                    {res.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {res.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(res.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reservations.length === 0 && (
        <PanelEmptyState
          title="Aún no tiene reservas"
          description="Cuando reserve una habitación, aparecerá aquí."
        />
      )}
    </PanelCard>
  );
}

function UserProfile({ user }: { user: UserType }) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ ...user });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateUser(formData);
    showToast('Perfil actualizado con éxito.');
  };

  return (
    <PanelCard className="max-w-xl">
      <form id="user-profile-form" onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="Datos personales" accent="indigo">
          <FormField label="Nombre completo" required>
            <input
              type="text"
              className={formInputClass}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>
          <FormField label="Email" hint="El email no se puede modificar.">
            <input type="email" disabled className={formInputClass} value={formData.email} />
          </FormField>
          <FormField label="Teléfono" required>
            <input
              type="tel"
              className={formInputClass}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </FormField>
        </FormSection>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setFormData({ ...user })}
            className="px-5 h-10 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Descartar
          </button>
          <button
            type="submit"
            className="px-5 h-10 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </PanelCard>
  );
}
