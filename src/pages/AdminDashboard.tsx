import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Bed, Calendar, MessageSquare, Settings, LogOut, 
  Plus, Edit, Trash2, Check, X, TrendingUp, Users, DollarSign, Star,
  Upload, ImagePlus, Facebook, Instagram, Search, Download,
  FileText, Printer, ChevronLeft, ChevronRight, Book, Mail, Phone, MapPin,
  Menu, BarChart3, Info
} from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { storage } from '../services/storage';
import { Room, Reservation, Review, HotelConfig, User as UserType, RoomType, RoomStatus, Invoice, GalleryImage, Complaint, ClientDocumentType, PaymentMethod } from '../types';
import { formatCurrency } from '../lib/utils';
import { downloadCsv, downloadExcel, downloadPdfTable } from '../utils/exportData';
import { barChartOptions, pieChartOptions, withBarLabels, pieDataset } from '../utils/chartTheme';
import { buildMonthlyReservationTrend, buildRoomTypeDistribution, buildMonthlyIncome } from '../utils/adminAnalytics';
import { readImageAsDataUrl } from '../utils/imageUpload';
import { generateElectronicInvoicePdf } from '../utils/electronicInvoicePdf';
import { buildElectronicPayload, payloadToInvoice, BOLETA_DNI_REQUIRED_FROM, getDefaultSeries } from '../utils/invoiceHelpers';
import { emitSunatComprobante, getSunatStatus } from '../services/sunatService';
import ExportButtons from '../components/admin/ExportButtons';
import { ReviewAvatar } from '../components/UserAvatar';
import { getReviewScopeLabel } from '../utils/reviewHelpers';
import {
  AppModal,
  FormSection,
  FormField,
  formInputClass,
  formSelectClass,
  formTextareaClass,
  ModalActions,
  SimulationBadge,
} from '../components/ui/Modal';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

import { useAuth } from '../AuthContext';
import {
  getTenantForAdminUser,
  getTenantPermissions,
  isAdminFeatureAllowed,
  isAdminPathAllowed,
  type AdminFeatureKey,
} from '../utils/tenantPermissions';
import {
  PanelPageHeader,
  PanelStatCard,
  PanelEmptyState,
  PanelSearchInput,
  PanelSessionCard,
  PlanBadge,
  PanelCard,
} from '../components/ui/PanelUi';
import { useToast } from '../context/ToastContext';
import type { Tenant } from '../types';

const ADMIN_ROUTE_META: { match: (path: string) => boolean; title: string; subtitle?: string }[] = [
  { match: (p) => p === '/admin', title: 'Dashboard', subtitle: 'Resumen operativo del hotel en tiempo real.' },
  { match: (p) => p.startsWith('/admin/habitaciones'), title: 'Habitaciones', subtitle: 'Inventario, precios y amenidades.' },
  { match: (p) => p.startsWith('/admin/calendario'), title: 'Calendario', subtitle: 'Disponibilidad y reservas por fecha.' },
  { match: (p) => p.startsWith('/admin/control'), title: 'Control Excel', subtitle: 'Tabla exportable de reservas.' },
  { match: (p) => p.startsWith('/admin/facturacion'), title: 'Facturación SUNAT', subtitle: 'Emisión de comprobantes electrónicos.' },
  { match: (p) => p.startsWith('/admin/reportes'), title: 'Reportes', subtitle: 'Análisis e indicadores del negocio.' },
  { match: (p) => p.startsWith('/admin/galeria'), title: 'Galería', subtitle: 'Imágenes del sitio público.' },
  { match: (p) => p.startsWith('/admin/reclamaciones'), title: 'Reclamaciones', subtitle: 'Libro de reclamaciones del hotel.' },
  { match: (p) => p.startsWith('/admin/reseñas'), title: 'Reseñas', subtitle: 'Moderación de opiniones de huéspedes.' },
  { match: (p) => p.startsWith('/admin/configuracion'), title: 'Configuración', subtitle: 'Datos del hotel y perfil fiscal.' },
];

function AdminRouteHeader({ pathname, tenant }: { pathname: string; tenant: Tenant | null }) {
  const meta = ADMIN_ROUTE_META.find((r) => r.match(pathname));
  if (!meta) return null;
  return (
    <PanelPageHeader
      title={meta.title}
      subtitle={meta.subtitle}
      badge={tenant ? <PlanBadge plan={tenant.plan} /> : undefined}
    />
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const adminTenant = currentUser ? getTenantForAdminUser(currentUser) : null;
  const tenantPermissions = getTenantPermissions(adminTenant);

  useEffect(() => {
    if (!currentUser) return;
    if (!isAdminPathAllowed(location.pathname, tenantPermissions)) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate, tenantPermissions, currentUser]);

  if (!currentUser) return null;

  const allSidebarLinks: {
    name: string;
    path: string;
    icon: typeof LayoutDashboard;
    feature: AdminFeatureKey;
  }[] = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, feature: 'dashboard' },
    { name: 'Habitaciones', path: '/admin/habitaciones', icon: Bed, feature: 'rooms' },
    { name: 'Calendario', path: '/admin/calendario', icon: Calendar, feature: 'calendar' },
    { name: 'Control Excel', path: '/admin/control', icon: TrendingUp, feature: 'control' },
    { name: 'Facturación', path: '/admin/facturacion', icon: DollarSign, feature: 'billing' },
    { name: 'Reportes', path: '/admin/reportes', icon: BarChart3, feature: 'reports' },
    { name: 'Galería', path: '/admin/galeria', icon: ImagePlus, feature: 'gallery' },
    { name: 'Reclamaciones', path: '/admin/reclamaciones', icon: Book, feature: 'complaints' },
    { name: 'Reseñas', path: '/admin/reseñas', icon: MessageSquare, feature: 'reviews' },
    { name: 'Configuración', path: '/admin/configuracion', icon: Settings, feature: 'config' },
  ];

  const sidebarLinks = allSidebarLinks.filter((link) =>
    isAdminFeatureAllowed(link.feature, tenantPermissions)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <Bed className="h-6 w-6" />
          <span>Admin Lumina</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { storage.setCurrentUser(null); navigate('/'); }}
            className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="h-6 w-6" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 lg:fixed lg:h-screen overflow-y-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 text-indigo-300 font-bold text-xl mb-6 lg:mb-8">
            <Bed className="h-8 w-8" />
            <div>
              <div>Admin Lumina</div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Panel hotel</div>
            </div>
          </div>
          <PanelSessionCard
            name={currentUser.name}
            email={currentUser.email}
            meta={adminTenant?.plan ? `Plan ${adminTenant.plan}` : undefined}
            dark
          />
          <nav className="space-y-1 flex-1">
            {sidebarLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  (link.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(link.path))
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-800">
          <button
            onClick={() => { storage.setCurrentUser(null); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 lg:ml-64 overflow-y-auto min-h-screen">
        <AdminRouteHeader pathname={location.pathname} tenant={adminTenant} />
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="habitaciones" element={<AdminRooms />} />
          <Route path="calendario" element={<AdminCalendar />} />
          <Route path="control" element={<AdminControlTable />} />
          <Route path="facturacion" element={
            <AdminFeatureGate feature="billing" permissions={tenantPermissions}>
              <AdminInvoices />
            </AdminFeatureGate>
          } />
          <Route path="reportes" element={
            <AdminFeatureGate feature="reports" permissions={tenantPermissions}>
              <AdminReports />
            </AdminFeatureGate>
          } />
          <Route path="galeria" element={<AdminGallery />} />
          <Route path="reclamaciones" element={<AdminComplaints />} />
          <Route path="reseñas" element={<AdminReviews />} />
          <Route path="configuracion" element={<AdminConfig />} />
        </Routes>
      </main>
    </div>
  );
}

function AdminFeatureGate({
  feature,
  permissions,
  children,
}: {
  feature: AdminFeatureKey;
  permissions: ReturnType<typeof getTenantPermissions>;
  children: React.ReactNode;
}) {
  if (!isAdminFeatureAllowed(feature, permissions)) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl border border-amber-200 p-10 text-center shadow-sm">
        <Info className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Función no incluida en su plan</h2>
        <p className="text-slate-600 mb-6">
          Esta sección requiere un plan Pro o Enterprise. Contacte al administrador de la plataforma para actualizar su suscripción.
        </p>
        <Link to="/admin" className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold">
          Volver al dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminOverview() {
  const rooms = storage.getRooms();
  const reservations = storage.getReservations();
  const reviews = storage.getReviews();
  const totalIncome = reservations.reduce(
    (sum, r) => (r.status !== 'cancelled' ? sum + Number(r.totalPrice || 0) : sum),
    0
  );

  const trend = buildMonthlyReservationTrend(reservations);
  const typeDist = buildRoomTypeDistribution(rooms);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <PanelStatCard label="Total reservas" value={reservations.length} icon={Calendar} tone="indigo" />
        <PanelStatCard label="Habitaciones" value={rooms.length} icon={Bed} tone="slate" />
        <PanelStatCard label="Reseñas" value={reviews.length} icon={Star} tone="amber" />
        <PanelStatCard label="Ingresos est." value={formatCurrency(totalIncome)} icon={DollarSign} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelCard>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Tendencia de reservas</h3>
          <p className="text-sm text-slate-500 mb-4">Últimos 6 meses</p>
          <Bar
            data={withBarLabels(trend.labels, 'Reservas', trend.data)}
            options={barChartOptions}
          />
        </PanelCard>
        <PanelCard>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Inventario por tipo</h3>
          <p className="text-sm text-slate-500 mb-4">Habitaciones registradas</p>
          <div className="h-72 w-full relative">
            <Pie data={pieDataset(typeDist.labels, typeDist.data)} options={pieChartOptions} />
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function AdminRooms() {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
  const [customAmenity, setCustomAmenity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 5;

  const COMMON_AMENITIES = [
    'WiFi', 'Aire Acondicionado', 'TV Cable', 'Caja Fuerte', 'Minibar', 
    'Escritorio', 'Jacuzzi', 'Cafetera Nespresso', 'Bata de Baño', 
    'Piscina Privada', 'Cocina', 'Mayordomo 24h', 'Traslado Aeropuerto',
    'Servicio al cuarto', 'Limpieza diaria', 'Vista al mar', 'Balcón'
  ];

  useEffect(() => {
    setRooms(storage.getRooms());
  }, []);

  const filteredRooms = rooms.filter(room => 
    (room.number.includes(searchTerm) || room.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (floorFilter === 'Todos' || room.floor === floorFilter)
  );

  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const paginatedRooms = filteredRooms.slice((currentPage - 1) * roomsPerPage, currentPage * roomsPerPage);
  const floors = ['Todos', ...Array.from(new Set(rooms.map(r => r.floor)))];

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta habitación?')) {
      storage.deleteRoom(id);
      setRooms(storage.getRooms());
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64String = await readImageAsDataUrl(file);
      setEditingRoom(prev => ({
        ...prev,
        images: [...(prev?.images || []), base64String]
      }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al subir imagen', 'error');
    }
  };

  const removeImage = (index: number) => {
    setEditingRoom(prev => ({
      ...prev,
      images: prev?.images?.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const current = editingRoom?.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    setEditingRoom(prev => ({ ...prev, amenities: updated }));
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim()) {
      const current = editingRoom?.amenities || [];
      if (!current.includes(customAmenity.trim())) {
        setEditingRoom(prev => ({ ...prev, amenities: [...current, customAmenity.trim()] }));
      }
      setCustomAmenity('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    
    const roomToSave: Room = {
      id: editingRoom.id || Math.random().toString(36).substr(2, 9),
      number: editingRoom.number || '',
      floor: editingRoom.floor || '1',
      name: editingRoom.name || '',
      type: editingRoom.type || RoomType.Standard,
      description: editingRoom.description || '',
      price: editingRoom.price || 0,
      capacity: editingRoom.capacity || 1,
      images: editingRoom.images || ['https://images.unsplash.com/photo-1566665797739-1674de7a421a'],
      amenities: editingRoom.amenities || ['WiFi', 'Aire Acondicionado'],
      featured: editingRoom.featured || false,
      status: editingRoom.status || RoomStatus.Available
    };

    try {
      storage.saveRoom(roomToSave);
      setRooms(storage.getRooms());
      setEditingRoom(null);
      showToast('Habitación guardada correctamente.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar la habitación', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setEditingRoom({ amenities: [], images: [] })}
          className="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva habitación
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <PanelSearchInput
          value={searchTerm}
          onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
          placeholder="Buscar por número o nombre…"
          className="flex-1"
        />
        <select
          value={floorFilter}
          onChange={(e) => { setFloorFilter(e.target.value); setCurrentPage(1); }}
          className={`${formSelectClass} sm:w-40`}
        >
          {floors.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <AppModal
        open={Boolean(editingRoom)}
        onClose={() => setEditingRoom(null)}
        title={editingRoom?.id ? 'Editar habitación' : 'Nueva habitación'}
        subtitle="Configure datos, fotos y amenidades."
        size="lg"
        footer={
          <ModalActions
            onCancel={() => setEditingRoom(null)}
            submitLabel="Guardar habitación"
            submitForm="admin-room-form"
          />
        }
      >
        {editingRoom && (
          <form id="admin-room-form" onSubmit={handleSave} className="space-y-5">
            <FormSection title="Información básica" accent="indigo">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Número" required>
                  <input
                    type="text"
                    required
                    className={formInputClass}
                    value={editingRoom.number || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, number: e.target.value })}
                  />
                </FormField>
                <FormField label="Piso" required>
                  <input
                    type="text"
                    required
                    className={formInputClass}
                    value={editingRoom.floor || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                  />
                </FormField>
                <FormField label="Nombre" required>
                  <input
                    type="text"
                    required
                    className={formInputClass}
                    value={editingRoom.name || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  />
                </FormField>
                <FormField label="Tipo" required>
                  <select
                    className={formSelectClass}
                    value={editingRoom.type || RoomType.Standard}
                    onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value as RoomType })}
                  >
                    {Object.values(RoomType).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Estado" required>
                  <select
                    className={formSelectClass}
                    value={editingRoom.status || RoomStatus.Available}
                    onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as RoomStatus })}
                  >
                    {Object.values(RoomStatus).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Precio / noche (S/)" required>
                  <input
                    type="number"
                    required
                    min="0"
                    className={formInputClass}
                    value={editingRoom.price || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, price: Number(e.target.value) })}
                  />
                </FormField>
                <FormField label="Capacidad" required>
                  <input
                    type="number"
                    required
                    min="1"
                    className={formInputClass}
                    value={editingRoom.capacity || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Descripción" accent="slate">
              <FormField label="Detalle de la habitación" required>
                <textarea
                  required
                  rows={3}
                  className={formTextareaClass}
                  value={editingRoom.description || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                />
              </FormField>
            </FormSection>

            <FormSection title="Fotos" description="Suba imágenes desde su equipo." accent="emerald">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {editingRoom.images?.map((img, i) => (
                  <div key={`${i}-${img.length}`} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-video rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 transition-all">
                  <ImagePlus className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-semibold uppercase">Subir</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </FormSection>

            <FormSection title="Amenidades" accent="amber">
              <div className="flex flex-wrap gap-2">
                {COMMON_AMENITIES.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      editingRoom.amenities?.includes(amenity)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Otra amenidad…"
                  className={`${formInputClass} flex-1`}
                  value={customAmenity}
                  onChange={(e) => setCustomAmenity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="shrink-0 h-10 px-4 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
                >
                  Agregar
                </button>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={editingRoom.featured || false}
                  onChange={(e) => setEditingRoom({ ...editingRoom, featured: e.target.checked })}
                />
                <span className="text-sm text-slate-700">Destacar en la página principal</span>
              </label>
            </FormSection>
          </form>
        )}
      </AppModal>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500">N°</th>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500">Piso</th>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500">Nombre</th>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500">Precio</th>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500">Estado</th>
              <th className="px-8 py-4 font-semibold text-sm text-gray-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedRooms.map(room => (
              <tr key={room.id}>
                <td className="px-8 py-4 font-bold text-gray-900">{room.number}</td>
                <td className="px-8 py-4 font-medium text-gray-700">{room.floor}</td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img src={room.images[0]} className="h-10 w-12 object-cover rounded-lg" />
                    <span className="font-medium">{room.name}</span>
                  </div>
                </td>
                <td className="px-8 py-4 font-bold text-indigo-600">{formatCurrency(room.price)}</td>
                <td className="px-8 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    room.status === RoomStatus.Available ? 'bg-green-100 text-green-700' :
                    room.status === RoomStatus.Reserved ? 'bg-yellow-100 text-yellow-700' :
                    room.status === RoomStatus.Occupied ? 'bg-red-100 text-red-700' :
                    room.status === RoomStatus.Cleaning ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {room.status}
                  </span>
                </td>
                <td className="px-8 py-4 text-right space-x-2">
                  <button onClick={() => setEditingRoom(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="h-5 w-5" /></button>
                  <button onClick={() => handleDelete(room.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-5 w-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={`page-${page}`}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded-lg font-bold ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminCalendar() {
  const [rooms] = useState<Room[]>(storage.getRooms());
  const [reservations, setReservations] = useState<Reservation[]>(storage.getReservations());
  const [startDate, setStartDate] = useState(startOfToday());
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [newRes, setNewRes] = useState<{roomId: string, date: Date} | null>(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('Todos');
  const daysToShow = 14;

  const roomTypes = ['Todos', ...Array.from(new Set(rooms.map(r => r.type)))];
  const filteredRooms = rooms.filter(r => roomTypeFilter === 'Todos' || r.type === roomTypeFilter);

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const getStatusForDay = (roomId: string, date: Date) => {
    const res = reservations.find(r => 
      r.roomId === roomId && 
      r.status !== 'cancelled' &&
      (isSameDay(parseISO(r.checkIn), date) || 
      (parseISO(r.checkIn) <= date && parseISO(r.checkOut) > date))
    );

    if (!res) return { status: 'Disponible', color: 'bg-gray-50 hover:bg-gray-100', icon: null };
    if (res.status === 'confirmed') return { status: 'Ocupada', color: 'bg-indigo-500 hover:bg-indigo-600', icon: '🔒', res };
    return { status: 'Reservada', color: 'bg-amber-400 hover:bg-amber-500', icon: '⏳', res };
  };

  const handleUpdateRes = (res: Reservation) => {
    storage.saveReservation(res);
    setReservations(storage.getReservations());
    setSelectedRes(null);
  };

  const handleDeleteRes = (id: string) => {
    if (confirm('¿Eliminar esta reserva?')) {
      storage.deleteReservation(id);
      setReservations(storage.getReservations());
      setSelectedRes(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Calendario de Ocupación</h2>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <select 
            value={roomTypeFilter} 
            onChange={e => setRoomTypeFilter(e.target.value)}
            className="p-2 bg-transparent text-sm font-bold outline-none"
          >
            {roomTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <button onClick={() => setStartDate(addDays(startDate, -7))} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronLeft className="h-5 w-5" /></button>
          <span className="font-bold text-sm px-4">{format(startDate, 'MMM d', { locale: es })} - {format(addDays(startDate, daysToShow - 1), 'MMM d, yyyy', { locale: es })}</span>
          <button onClick={() => setStartDate(addDays(startDate, 7))} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 p-6 text-left border-b border-r border-gray-100 min-w-[200px] font-bold text-gray-500 uppercase tracking-wider text-xs">Habitación</th>
                {days.map(day => (
                  <th key={day.toISOString()} className="p-4 border-b border-gray-100 bg-gray-50 min-w-[100px] text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase">{format(day, 'EEE', { locale: es })}</div>
                    <div className="text-lg font-black text-gray-900">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => (
                <tr key={room.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 p-6 border-r border-b border-gray-100 font-bold text-gray-900">
                    <div className="flex flex-col">
                      <span className="text-indigo-600">#{room.number}</span>
                      <span className="text-sm font-medium text-gray-500">{room.name}</span>
                    </div>
                  </td>
                  {days.map(day => {
                    const info = getStatusForDay(room.id, day);
                    return (
                      <td key={day.toISOString()} className="p-2 border-b border-gray-100">
                        <div 
                          onClick={() => info.res ? setSelectedRes(info.res) : setNewRes({roomId: room.id, date: day})}
                          className={`h-12 w-full rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 ${info.color}`}
                        >
                          {info.icon && <span className="text-white text-lg">{info.icon}</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRes && (
        <ReservationModal 
          reservation={selectedRes} 
          onClose={() => setSelectedRes(null)} 
          onSave={handleUpdateRes}
          onDelete={handleDeleteRes}
        />
      )}

      {newRes && (
        <NewReservationModal 
          roomId={newRes.roomId}
          date={newRes.date}
          onClose={() => setNewRes(null)}
          onSave={(res) => {
            storage.saveReservation(res);
            setReservations(storage.getReservations());
            setNewRes(null);
          }}
        />
      )}

      <div className="flex gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 rounded-lg border border-gray-200"></div>
          <span className="text-xs font-bold text-gray-500">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-400 rounded-lg flex items-center justify-center text-[10px]">⏳</div>
          <span className="text-xs font-bold text-gray-500">Reservada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-500 rounded-lg flex items-center justify-center text-[10px]">🔒</div>
          <span className="text-xs font-bold text-gray-500">Ocupada</span>
        </div>
      </div>
    </div>
  );
}

function ReservationModal({ reservation, onClose, onSave, onDelete }: { 
  reservation: Reservation; 
  onClose: () => void; 
  onSave: (res: Reservation) => void;
  onDelete: (id: string) => void;
}) {
  const [edited, setEdited] = useState<Reservation>(reservation);

  return (
    <AppModal
      open
      onClose={onClose}
      title="Detalles de reserva"
      subtitle="Modifique fechas, cliente o estado."
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 h-10 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onDelete(edited.id)}
            className="w-full sm:w-auto h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            aria-label="Eliminar reserva"
          >
            <Trash2 className="h-4 w-4 mx-auto" />
          </button>
          <button
            type="button"
            onClick={() => onSave(edited)}
            className="w-full sm:flex-1 sm:max-w-xs h-10 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Guardar cambios
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <FormSection title="Huésped y estado" accent="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Cliente" required>
              <input
                className={formInputClass}
                value={edited.userName}
                onChange={(e) => setEdited({ ...edited, userName: e.target.value })}
              />
            </FormField>
            <FormField label="Estado" required>
              <select
                className={formSelectClass}
                value={edited.status}
                onChange={(e) => setEdited({ ...edited, status: e.target.value as Reservation['status'] })}
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </FormField>
          </div>
        </FormSection>
        <FormSection title="Estancia" accent="slate">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Check-in" required>
              <input
                type="date"
                className={formInputClass}
                value={edited.checkIn}
                onChange={(e) => setEdited({ ...edited, checkIn: e.target.value })}
              />
            </FormField>
            <FormField label="Check-out" required>
              <input
                type="date"
                className={formInputClass}
                value={edited.checkOut}
                onChange={(e) => setEdited({ ...edited, checkOut: e.target.value })}
              />
            </FormField>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 flex justify-between items-center">
            <span className="text-sm font-semibold text-indigo-700">Total</span>
            <span className="text-lg font-bold text-indigo-900">{formatCurrency(edited.totalPrice)}</span>
          </div>
        </FormSection>
      </div>
    </AppModal>
  );
}

function NewReservationModal({ roomId, date, onClose, onSave }: {
  roomId: string;
  date: Date;
  onClose: () => void;
  onSave: (res: Reservation) => void;
}) {
  const [userName, setUserName] = useState('');
  const [checkOut, setCheckOut] = useState(format(addDays(date, 1), 'yyyy-MM-dd'));

  const handleCreate = () => {
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      roomId,
      roomName: storage.getRooms().find((r) => r.id === roomId)?.name || '',
      userId: 'guest',
      userName,
      userEmail: 'guest@example.com',
      userPhone: '000000000',
      checkIn: format(date, 'yyyy-MM-dd'),
      checkOut,
      guests: 1,
      totalPrice: 100,
      status: 'confirmed',
      extras: { breakfast: false, shuttle: false, extraBed: false },
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title="Nueva reserva"
      subtitle={`Check-in: ${format(date, 'dd/MM/yyyy', { locale: es })}`}
      size="sm"
      footer={
        <ModalActions
          onCancel={onClose}
          submitLabel="Crear reserva"
          submitType="button"
          onSubmit={handleCreate}
          disabled={!userName.trim()}
        />
      }
    >
      <FormSection title="Datos del huésped" accent="indigo">
        <FormField label="Nombre completo" required>
          <input
            className={formInputClass}
            placeholder="Nombre del cliente"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Check-in">
            <input type="date" className={formInputClass} value={format(date, 'yyyy-MM-dd')} disabled />
          </FormField>
          <FormField label="Check-out" required>
            <input
              type="date"
              className={formInputClass}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>
    </AppModal>
  );
}

function AdminControlTable() {
  const [reservations, setReservations] = useState<Reservation[]>(storage.getReservations());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Reservation; direction: 'asc' | 'desc' } | null>(null);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  const filteredReservations = reservations
    .filter(res => 
      res.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.roomName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key: keyof Reservation) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleUpdateRes = (res: Reservation) => {
    storage.saveReservation(res);
    setReservations(storage.getReservations());
    setSelectedRes(null);
  };

  const handleDeleteRes = (id: string) => {
    if (confirm('¿Eliminar esta reserva?')) {
      storage.deleteReservation(id);
      setReservations(storage.getReservations());
      setSelectedRes(null);
    }
  };

  const reservationExportRows = filteredReservations.map((r) => ({
    ID: r.id,
    Cliente: r.userName,
    Habitación: r.roomName,
    Entrada: r.checkIn,
    Salida: r.checkOut,
    Total: r.totalPrice,
    Estado: r.status,
    Huéspedes: r.guests ?? '',
  }));

  const exportReservations = (type: 'csv' | 'excel' | 'pdf') => {
    const headers = ['ID', 'Cliente', 'Habitación', 'Entrada', 'Salida', 'Total', 'Estado', 'Huéspedes'];
    const rows = reservationExportRows.map((r) => Object.values(r));
    if (type === 'csv') downloadCsv('reservas_lumina', headers, rows);
    else if (type === 'excel') downloadExcel('reservas_lumina.xlsx', 'Reservas', reservationExportRows);
    else
      downloadPdfTable({
        filename: 'reservas_lumina.pdf',
        title: 'Control de Reservas',
        subtitle: `Exportado: ${new Date().toLocaleString('es-PE')} · ${filteredReservations.length} registros`,
        head: headers,
        body: rows,
      });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Control de Reservas</h2>
        <ExportButtons
          onCsv={() => exportReservations('csv')}
          onExcel={() => exportReservations('excel')}
          onPdf={() => exportReservations('pdf')}
        />
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o habitación..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['userName', 'roomName', 'checkIn', 'checkOut', 'totalPrice', 'status'].map(key => (
                  <th 
                    key={key}
                    onClick={() => handleSort(key as keyof Reservation)}
                    className="px-6 py-4 font-bold text-xs text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {key === 'userName' ? 'Cliente' : 
                       key === 'roomName' ? 'Habitación' : 
                       key === 'checkIn' ? 'Entrada' : 
                       key === 'checkOut' ? 'Salida' : 
                       key === 'totalPrice' ? 'Total' : 'Estado'}
                      {sortConfig?.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 font-bold text-xs text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReservations.map(res => (
                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{res.userName}</td>
                  <td className="px-6 py-4 font-medium text-gray-600">{res.roomName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{res.checkIn}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{res.checkOut}</td>
                  <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(res.totalPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      res.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedRes(res)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Edit className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRes && (
        <ReservationModal 
          reservation={selectedRes} 
          onClose={() => setSelectedRes(null)} 
          onSave={handleUpdateRes}
          onDelete={handleDeleteRes}
        />
      )}
    </div>
  );
}

function AdminConfig() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<HotelConfig>(storage.getConfig());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveConfig(config);
    showToast('Configuración actualizada con éxito.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Configuración del Hotel</h2>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">Ajustes Globales</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-600" /> Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nombre del Hotel</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.name}
                  onChange={e => setConfig({...config, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email de Contacto</label>
                <input
                  type="email"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.email}
                  onChange={e => setConfig({...config, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Teléfono Principal</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.phone}
                  onChange={e => setConfig({...config, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">WhatsApp (Número sin +)</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.whatsapp}
                  onChange={e => setConfig({...config, whatsapp: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Dirección Física</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.address}
                onChange={e => setConfig({...config, address: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Descripción del Hotel</label>
              <textarea
                rows={4}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={config.description || ''}
                onChange={e => setConfig({...config, description: e.target.value})}
                placeholder="Breve historia o descripción del hotel..."
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Datos fiscales SUNAT
            </h3>
            <p className="text-sm text-gray-500">
              Obligatorios para boleta y factura electrónica. Configure su RUC real antes de producción.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">RUC (11 dígitos)</label>
                <input
                  type="text"
                  maxLength={11}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.fiscal?.ruc ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, ruc: e.target.value.replace(/\D/g, '') },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Razón social</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.fiscal?.razonSocial ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, razonSocial: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nombre comercial</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.fiscal?.nombreComercial ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, nombreComercial: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Domicilio fiscal</label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.fiscal?.domicilioFiscal ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, domicilioFiscal: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Serie boleta (4 caracteres)</label>
                <input
                  type="text"
                  maxLength={4}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                  value={config.fiscal?.boletaSeries ?? 'B001'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, boletaSeries: e.target.value.toUpperCase() },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Serie factura (4 caracteres)</label>
                <input
                  type="text"
                  maxLength={4}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                  value={config.fiscal?.facturaSeries ?? 'F001'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, facturaSeries: e.target.value.toUpperCase() },
                    })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={config.fiscal?.esEmisorElectronico ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fiscal: { ...config.fiscal!, esEmisorElectronico: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              Habilitado como emisor electrónico ante SUNAT
            </label>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" /> Redes Sociales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" /> Facebook URL
                </label>
                <input
                  type="url"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.facebook || ''}
                  onChange={e => setConfig({...config, facebook: e.target.value})}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" /> Instagram URL
                </label>
                <input
                  type="url"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.instagram || ''}
                  onChange={e => setConfig({...config, instagram: e.target.value})}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 text-center">
            <h3 className="text-xl font-bold">Logo del Hotel</h3>
            <div className="relative mx-auto w-32 h-32 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
              {config.logo ? (
                <img src={config.logo} className="w-full h-full object-contain" />
              ) : (
                <Bed className="h-12 w-12 text-gray-300" />
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                <Upload className="h-6 w-6" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-xs text-gray-500">Recomendado: PNG transparente 512x512px</p>
          </div>

          <div className="sticky top-24">
            <button 
              type="submit" 
              className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-bold text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
            >
              Guardar Cambios
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Los cambios se aplicarán instantáneamente en todo el sitio web.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    setReviews(storage.getReviews());
  }, []);

  const handleApprove = (id: string) => {
    storage.approveReview(id);
    setReviews(storage.getReviews());
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta reseña?')) {
      storage.deleteReview(id);
      setReviews(storage.getReviews());
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Gestión de Reseñas</h2>
        <ExportButtons
          onCsv={() => {
            const headers = ['Cliente', 'Calificación', 'Comentario', 'Aprobada'];
            downloadCsv(
              'resenas_lumina',
              headers,
              reviews.map((r) => [r.userName, r.rating, r.comment, r.approved ? 'Sí' : 'No'])
            );
          }}
          onExcel={() =>
            downloadExcel(
              'resenas_lumina.xlsx',
              'Reseñas',
              reviews.map((r) => ({
                Cliente: r.userName,
                Calificación: r.rating,
                Comentario: r.comment,
                Aprobada: r.approved ? 'Sí' : 'No',
              }))
            )
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-6">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center gap-4">
            <div className="flex gap-4 min-w-0">
              <ReviewAvatar review={review} size="lg" ring />
              <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-bold text-gray-900">{review.userName}</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                {!review.approved && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">Pendiente</span>}
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">{getReviewScopeLabel(review)}</span>
              </div>
              <p className="text-gray-600 italic">"{review.comment}"</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!review.approved && (
                <button onClick={() => handleApprove(review.id)} className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100"><Check className="h-5 w-5" /></button>
              )}
              <button onClick={() => handleDelete(review.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 className="h-5 w-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminInvoices() {
  const { showToast } = useToast();
  const [reservations] = useState<Reservation[]>(
    storage.getReservations().filter((r) => r.status === 'confirmed' || r.status === 'pending_payment')
  );
  const [invoices, setInvoices] = useState<Invoice[]>(storage.getInvoices());
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [invoiceType, setInvoiceType] = useState<'Boleta' | 'Factura'>('Boleta');
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientDocType, setClientDocType] = useState<ClientDocumentType>('DNI');
  const [clientAddress, setClientAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Contado');
  const [creditPending, setCreditPending] = useState('');
  const [seriesCode, setSeriesCode] = useState('B001');
  const [isEmitting, setIsEmitting] = useState(false);
  const [sunatInfo, setSunatInfo] = useState<{
    provider: string;
    configured: boolean;
    simulation?: boolean;
    label?: string;
  }>({
    provider: 'demo',
    configured: true,
    simulation: true,
    label: 'Simulación académica',
  });
  const config = storage.getConfig();

  useEffect(() => {
    getSunatStatus().then(setSunatInfo).catch(() => undefined);
  }, []);

  const openModal = (reservation?: Reservation) => {
    const res = reservation ?? reservations[0] ?? null;
    setSelectedRes(res);
    if (res) {
      setClientName(res.userName);
      setClientDoc('');
      setClientDocType('DNI');
      setClientAddress('');
      setPaymentMethod('Contado');
      setCreditPending('');
      setInvoiceType('Boleta');
      setSeriesCode(getDefaultSeries('Boleta', config));
    }
  };

  const handleGenerate = async () => {
    if (!selectedRes) return;

    setIsEmitting(true);
    try {
      const payload = buildElectronicPayload(
        selectedRes,
        config,
        {
          type: invoiceType,
          series: seriesCode.trim().toUpperCase(),
          clientName: clientName.trim() || selectedRes.userName,
          clientDocument: clientDoc.trim(),
          clientDocumentType: invoiceType === 'Factura' ? 'RUC' : clientDocType,
          clientAddress: invoiceType === 'Factura' ? clientAddress.trim() : undefined,
          paymentMethod,
          creditPendingAmount:
            paymentMethod === 'Credito' ? Number(creditPending) || undefined : undefined,
        },
        invoices
      );

      const result = await emitSunatComprobante(payload);
      if (!result.success) {
        const msg = result.message || 'No se pudo emitir el comprobante.';
        if (/serie/i.test(msg)) {
          showToast(
            `Serie "${seriesCode}" no habilitada. Revise Locales y Series en NubeFact.`,
            'error'
          );
        } else {
          showToast(msg, 'error');
        }
        return;
      }

      const newInvoice = payloadToInvoice(payload, result);
      storage.saveInvoice(newInvoice);
      setInvoices(storage.getInvoices());
      setSelectedRes(null);
      showToast(
        result.status === 'simulado'
          ? `Comprobante ${newInvoice.fullNumber} generado (simulación).`
          : `Comprobante ${newInvoice.fullNumber} aceptado por SUNAT.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al emitir comprobante.', 'error');
    } finally {
      setIsEmitting(false);
    }
  };

  const downloadPDF = (invoice: Invoice) => {
    generateElectronicInvoicePdf(invoice, config).save(`${invoice.fullNumber || invoice.id}.pdf`);
  };

  const printInvoice = (invoice: Invoice) => {
    const url = generateElectronicInvoicePdf(invoice, config).output('bloburl');
    window.open(url, '_blank');
  };

  const statusColor = (status: Invoice['sunatStatus']) => {
    switch (status) {
      case 'aceptado':
        return 'bg-green-100 text-green-700';
      case 'simulado':
        return 'bg-amber-100 text-amber-700';
      case 'rechazado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const previewTotal = selectedRes?.totalPrice ?? 0;
  const requiresDni =
    invoiceType === 'Boleta' && previewTotal > BOLETA_DNI_REQUIRED_FROM;

  return (
    <div className="space-y-6">
      {sunatInfo.simulation && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <SimulationBadge label="SUNAT simulado" />
          <span>{sunatInfo.label || 'Sin envío real · válido para sustentación académica.'}</span>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-end items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <ExportButtons
            onCsv={() => {
              const headers = [
                'Número',
                'Tipo',
                'Cliente',
                'Documento',
                'Habitación',
                'Gravado',
                'IGV',
                'Total',
                'Estado SUNAT',
                'Fecha',
              ];
              downloadCsv(
                'comprobantes_lumina',
                headers,
                invoices.map((inv) => [
                  inv.fullNumber || inv.id,
                  inv.type,
                  inv.clientName,
                  inv.clientDocument,
                  inv.roomNumber,
                  inv.taxableAmount,
                  inv.igv,
                  inv.total,
                  inv.sunatStatus,
                  inv.emissionDate || inv.date,
                ])
              );
            }}
            onExcel={() =>
              downloadExcel(
                'comprobantes_lumina.xlsx',
                'Comprobantes',
                invoices.map((inv) => ({
                  Número: inv.fullNumber || inv.id,
                  Tipo: inv.type,
                  Cliente: inv.clientName,
                  Documento: inv.clientDocument,
                  Habitación: inv.roomNumber,
                  Gravado: inv.taxableAmount,
                  IGV: inv.igv,
                  Total: inv.total,
                  'Estado SUNAT': inv.sunatStatus,
                  Fecha: inv.emissionDate || inv.date,
                }))
              )
            }
          />
          <button
            onClick={() => openModal()}
            disabled={reservations.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Plus className="h-5 w-5" /> Emitir comprobante
          </button>
        </div>
      </div>

      <AppModal
        open={Boolean(selectedRes)}
        onClose={() => setSelectedRes(null)}
        title={`Emitir ${invoiceType} electrónica`}
        subtitle="Comprobante vinculado a una reserva confirmada."
        badge={sunatInfo.simulation ? <SimulationBadge label="SUNAT simulado" /> : undefined}
        footer={
          <ModalActions
            onCancel={() => setSelectedRes(null)}
            submitLabel={
              isEmitting
                ? sunatInfo.simulation
                  ? 'Generando…'
                  : 'Enviando…'
                : sunatInfo.simulation
                  ? 'Generar comprobante'
                  : 'Emitir comprobante'
            }
            submitType="button"
            onSubmit={handleGenerate}
            loading={isEmitting}
          />
        }
      >
        {selectedRes && (
          <div className="space-y-5">
            <FormSection title="Reserva" accent="indigo">
              <FormField label="Seleccionar reserva">
                <select
                  className={formSelectClass}
                  value={selectedRes.id}
                  onChange={(e) => {
                    const res = reservations.find((r) => r.id === e.target.value) || null;
                    setSelectedRes(res);
                    if (res) setClientName(res.userName);
                  }}
                >
                  {reservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.userName} · {r.roomName} ({r.checkIn}) · {formatCurrency(r.totalPrice)}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormSection>

            <FormSection title="Comprobante" accent="slate">
              <FormField label="Tipo">
                <div className="grid grid-cols-2 gap-2">
                  {(['Boleta', 'Factura'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setInvoiceType(t);
                        setSeriesCode(getDefaultSeries(t, config));
                        if (t === 'Factura') setClientDocType('RUC');
                      }}
                      className={`h-10 rounded-lg text-sm font-semibold border transition-all ${
                        invoiceType === t
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField
                label="Serie"
                hint={
                  sunatInfo.simulation
                    ? 'Simulación: F001 o B001 funcionan sin NubeFact.'
                    : 'Debe coincidir con la serie en NubeFact.'
                }
              >
                <input
                  type="text"
                  maxLength={4}
                  className={`${formInputClass} uppercase font-mono`}
                  value={seriesCode}
                  onChange={(e) => setSeriesCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder={invoiceType === 'Factura' ? 'F001' : 'B001'}
                />
              </FormField>
            </FormSection>

            <FormSection title="Cliente" accent="emerald">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Razón social / Nombre" className="sm:col-span-2">
                  <input
                    type="text"
                    className={formInputClass}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </FormField>
                {invoiceType === 'Boleta' && (
                  <FormField label="Tipo documento">
                    <select
                      className={formSelectClass}
                      value={clientDocType}
                      onChange={(e) => setClientDocType(e.target.value as ClientDocumentType)}
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné extranjería</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </FormField>
                )}
                <FormField
                  label={invoiceType === 'Factura' ? 'RUC' : 'N° documento'}
                  hint={requiresDni ? 'Obligatorio para ventas > S/ 700' : undefined}
                  className={invoiceType === 'Boleta' ? '' : 'sm:col-span-2'}
                >
                  <input
                    type="text"
                    className={formInputClass}
                    value={clientDoc}
                    onChange={(e) => setClientDoc(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder={invoiceType === 'Factura' ? '20XXXXXXXXX' : '70654321'}
                  />
                </FormField>
                {invoiceType === 'Factura' && (
                  <FormField label="Dirección" className="sm:col-span-2">
                    <input
                      type="text"
                      className={formInputClass}
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                    />
                  </FormField>
                )}
                <FormField label="Forma de pago">
                  <select
                    className={formSelectClass}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </FormField>
                {paymentMethod === 'Credito' && invoiceType === 'Factura' && (
                  <FormField label="Monto neto pendiente (S/)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={formInputClass}
                      value={creditPending}
                      onChange={(e) => setCreditPending(e.target.value)}
                    />
                  </FormField>
                )}
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-sm text-indigo-900">
                Total con IGV: <strong>{formatCurrency(selectedRes.totalPrice)}</strong>
                <span className="text-indigo-700/80">
                  {' '}
                  · Gravado {formatCurrency(selectedRes.totalPrice / 1.18)} · IGV{' '}
                  {formatCurrency(selectedRes.totalPrice - selectedRes.totalPrice / 1.18)}
                </span>
              </div>
            </FormSection>
          </div>
        )}
      </AppModal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                  {inv.type}
                </span>
                <div className="text-lg font-bold mt-1">{inv.fullNumber || inv.id}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(inv.sunatStatus)}`}>
                  {inv.sunatStatus}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</div>
                <div className="text-[10px] text-gray-400">IGV {formatCurrency(inv.igv)}</div>
                <div className="text-[10px] text-gray-400">{inv.emissionDate || inv.date}</div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-50 space-y-2">
              <div className="text-sm font-medium text-gray-600">{inv.clientName}</div>
              <div className="text-xs text-gray-400">
                {inv.clientDocumentType}: {inv.clientDocument || '—'} · Hab. {inv.roomNumber}
              </div>
              {inv.sunatMessage && <div className="text-xs text-gray-500">{inv.sunatMessage}</div>}
            </div>
            <div className="flex gap-2 pt-2">
              {inv.sunatPdfUrl && (
                <a
                  href={inv.sunatPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold"
                >
                  SUNAT PDF
                </a>
              )}
              <button
                onClick={() => downloadPDF(inv)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => printInvoice(inv)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminReports() {
  const reservations = storage.getReservations();
  const rooms = storage.getRooms();
  const monthlyIncome = buildMonthlyIncome(reservations);
  const incomeLabels = Object.keys(monthlyIncome);
  const incomeValues = Object.values(monthlyIncome);

  const barData = withBarLabels(incomeLabels, 'Ingresos (S/)', incomeValues);

  const occupancyRate =
    rooms.length > 0
      ? (rooms.filter((r) => r.status === RoomStatus.Occupied).length / rooms.length) * 100
      : 0;

  const reportRows = reservations.map((r) => ({
    ID: r.id,
    Cliente: r.userName,
    Habitación: r.roomName,
    Entrada: r.checkIn,
    Salida: r.checkOut,
    Total: r.totalPrice,
    Estado: r.status,
  }));

  const exportReport = (type: 'csv' | 'excel' | 'pdf') => {
    const headers = ['ID', 'Cliente', 'Habitación', 'Entrada', 'Salida', 'Total', 'Estado'];
    const rows = reportRows.map((r) => Object.values(r));
    if (type === 'csv') downloadCsv('reporte_hotel', headers, rows);
    else if (type === 'excel') downloadExcel('reporte_hotel.xlsx', 'Reporte', reportRows);
    else
      downloadPdfTable({
        filename: 'reporte_hotel.pdf',
        title: 'Reporte de Gestión Hotelera',
        subtitle: `Ingresos totales: ${formatCurrency(incomeValues.reduce((a, b) => a + b, 0))}`,
        head: ['Mes', 'Ingresos'],
        body:
          incomeLabels.length > 0
            ? incomeLabels.map((m, i) => [m, formatCurrency(incomeValues[i])])
            : [['Sin datos', 'S/ 0.00']],
      });
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h2>
        <ExportButtons
          onCsv={() => exportReport('csv')}
          onExcel={() => exportReport('excel')}
          onPdf={() => exportReport('pdf')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <div className="text-4xl font-black text-indigo-600 mb-2">{occupancyRate.toFixed(1)}%</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Ocupación Actual</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <div className="text-4xl font-black text-green-600 mb-2">{formatCurrency(Object.values(monthlyIncome).reduce((a: any, b: any) => a + b, 0) as number)}</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Ingresos Totales</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <div className="text-4xl font-black text-blue-600 mb-2">{reservations.length}</div>
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Reservas</div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold mb-2">Análisis de Ingresos Mensuales</h3>
        <p className="text-sm text-gray-500 mb-8">Basado en reservas confirmadas</p>
        <Bar data={barData} options={barChartOptions} />
      </div>
    </div>
  );
}

function AdminGallery() {
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<Partial<GalleryImage>>({});
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setGallery(storage.getGallery());
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setCurrentImage((prev) => ({ ...prev, url: dataUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!currentImage.url || !currentImage.title) return;
    
    const newImage: GalleryImage = {
      id: currentImage.id || Date.now().toString(),
      url: currentImage.url,
      title: currentImage.title
    };

    storage.saveGalleryImage(newImage);
    setGallery(storage.getGallery());
    setIsModalOpen(false);
    setCurrentImage({});
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta imagen?')) {
      storage.deleteGalleryImage(id);
      setGallery(storage.getGallery());
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestión de Galería</h2>
          <p className="text-gray-500">Administra las imágenes que se muestran en la página principal.</p>
        </div>
        <button
          onClick={() => { setCurrentImage({}); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="h-5 w-5" /> Nueva Imagen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {gallery.map((img) => (
          <div key={img.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm group">
            <div className="relative h-64">
              <img src={img.url} alt={img.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button
                  onClick={() => { setCurrentImage(img); setIsModalOpen(true); }}
                  className="p-3 bg-white text-indigo-600 rounded-xl hover:scale-110 transition-transform"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="p-3 bg-white text-red-600 rounded-xl hover:scale-110 transition-transform"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-gray-900">{img.title}</h3>
            </div>
          </div>
        ))}
      </div>

      <AppModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentImage.id ? 'Editar imagen' : 'Nueva imagen'}
        subtitle="Título, archivo local o URL externa."
        size="sm"
        footer={
          <ModalActions
            onCancel={() => setIsModalOpen(false)}
            submitLabel="Guardar imagen"
            submitType="button"
            onSubmit={handleSave}
          />
        }
      >
        <div className="space-y-5">
          <FormSection title="Contenido" accent="indigo">
            <FormField label="Título" required>
              <input
                type="text"
                className={formInputClass}
                placeholder="Ej. Piscina Infinity"
                value={currentImage.title || ''}
                onChange={(e) => setCurrentImage({ ...currentImage, title: e.target.value })}
              />
            </FormField>
            <FormField label="Archivo" hint="JPG, PNG o WebP · máx. 2 MB">
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50/40 cursor-pointer hover:bg-indigo-50 transition-colors">
                <Upload className="h-6 w-6 text-indigo-500 mb-1" />
                <span className="text-xs font-semibold text-indigo-700">Subir desde el ordenador</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            </FormField>
            <FormField label="URL externa (opcional)">
              <input
                type="text"
                className={formInputClass}
                placeholder="https://…"
                value={currentImage.url?.startsWith('data:') ? '' : currentImage.url || ''}
                onChange={(e) => setCurrentImage({ ...currentImage, url: e.target.value })}
              />
            </FormField>
            {currentImage.url && (
              <div className="rounded-lg overflow-hidden h-36 border border-slate-200">
                <img src={currentImage.url} alt="Vista previa" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
          </FormSection>
        </div>
      </AppModal>
    </div>
  );
}

function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    setComplaints(storage.getComplaints());
  }, []);

  const handleUpdateStatus = (id: string, status: Complaint['status']) => {
    const complaint = complaints.find(c => c.id === id);
    if (complaint) {
      const updated = { ...complaint, status };
      storage.saveComplaint(updated);
      setComplaints(storage.getComplaints());
      if (selectedComplaint?.id === id) setSelectedComplaint(updated);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este registro?')) {
      storage.deleteComplaint(id);
      setComplaints(storage.getComplaints());
      if (selectedComplaint?.id === id) setSelectedComplaint(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Libro de Reclamaciones</h2>
          <p className="text-gray-500">Gestiona los reclamos y quejas presentados por los clientes.</p>
        </div>
        <ExportButtons
          onCsv={() => {
            const headers = ['Fecha', 'Cliente', 'Email', 'Tipo', 'Estado', 'Descripción'];
            downloadCsv(
              'reclamaciones_lumina',
              headers,
              complaints.map((c) => [
                c.date,
                c.fullName,
                c.email,
                c.type,
                c.status,
                c.description,
              ])
            );
          }}
          onExcel={() =>
            downloadExcel(
              'reclamaciones_lumina.xlsx',
              'Reclamaciones',
              complaints.map((c) => ({
                Fecha: c.date,
                Cliente: c.fullName,
                Email: c.email,
                Teléfono: c.phone,
                Tipo: c.type,
                Estado: c.status,
                Descripción: c.description,
              }))
            )
          }
        />
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="p-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="p-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                <th className="p-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="p-6 text-sm font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                    No hay reclamaciones registradas.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-medium text-gray-600">{c.date}</td>
                    <td className="p-6">
                      <div className="font-bold text-gray-900">{c.fullName}</div>
                      <div className="text-xs text-gray-400">{c.email}</div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        c.type === 'Reclamo' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        c.status === 'Atendido' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedComplaint(c)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AppModal
        open={Boolean(selectedComplaint)}
        onClose={() => setSelectedComplaint(null)}
        title={selectedComplaint ? `Detalle de ${selectedComplaint.type.toLowerCase()}` : ''}
        subtitle={selectedComplaint?.date}
        size="md"
        footer={
          selectedComplaint && (
            <>
              {selectedComplaint.status === 'Pendiente' ? (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedComplaint.id, 'Atendido')}
                  className="w-full sm:flex-1 h-10 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" /> Marcar atendido
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedComplaint.id, 'Pendiente')}
                  className="w-full sm:flex-1 h-10 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" /> Marcar pendiente
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="w-full sm:w-auto px-5 h-10 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
            </>
          )
        }
      >
        {selectedComplaint && (
          <div className="space-y-5">
            <FormSection title="Datos del solicitante" accent="indigo">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedComplaint.fullName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documento</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedComplaint.documentType} {selectedComplaint.documentNumber}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contacto</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedComplaint.email}</div>
                  <div className="text-slate-500">{selectedComplaint.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</div>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedComplaint.status === 'Atendido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedComplaint.address}</div>
                </div>
              </div>
            </FormSection>
            <FormSection title="Descripción" accent="slate">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedComplaint.description}
              </p>
            </FormSection>
          </div>
        )}
      </AppModal>
    </div>
  );
}
