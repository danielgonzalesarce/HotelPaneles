import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Settings, LogOut, 
  Plus, Edit, Trash2, Check, X, TrendingUp, DollarSign,
  Building2, ShieldAlert, Menu, AlertTriangle, PlusCircle, FileText, Search, BarChart3, Receipt,
  Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { storage } from '../services/storage';
import { User as UserType, Tenant, GlobalConfig, TenantPlan } from '../types';
import { formatCurrency } from '../lib/utils';
import { downloadCsv, downloadExcel } from '../utils/exportData';
import { validateRuc, type RucValidationResponse } from '../services/rucService';
import { enrichTenantWithPlan } from '../utils/tenantPermissions';
import {
  permissionsSummary,
  resolvePlanPermissions,
  resolvePlanPrice,
} from '../../lib/tenant/planPermissions.js';
import SuperAdminSunatBilling from '../components/superadmin/SuperAdminSunatBilling';
import { SimulationBadge, StatCard, EmptyState, AppModal, FormSection, FormField, formInputClass, formSelectClass, ModalActions, PlanPermissionsPreview } from '../components/superadmin/SuperAdminUi';
import ExportButtons from '../components/admin/ExportButtons';
import {
  buildMrrByPlan,
  buildTenantStatusCounts,
  buildPlatformBillingByMonth,
  getUpcomingBillingTenants,
} from '../utils/superAdminAnalytics';
import { barChartOptions, pieChartOptions, withBarLabels, pieDataset } from '../utils/chartTheme';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

import { useAuth } from '../AuthContext';
import { PanelPageHeader } from '../components/ui/PanelUi';
import { useToast } from '../context/ToastContext';

const SUPERADMIN_ROUTE_META: { match: (p: string) => boolean; title: string; subtitle?: string; badge?: React.ReactNode }[] = [
  { match: (p) => p === '/superadmin', title: 'Panel SaaS', subtitle: 'Métricas y salud de la plataforma.', badge: <SimulationBadge /> },
  { match: (p) => p.startsWith('/superadmin/empresas'), title: 'Empresas', subtitle: 'Tenants conectados a Lumina SaaS.' },
  { match: (p) => p.startsWith('/superadmin/facturacion'), title: 'Facturación SUNAT', subtitle: 'Comprobantes SaaS simulados.', badge: <SimulationBadge /> },
  { match: (p) => p.startsWith('/superadmin/configuracion'), title: 'Configuración global', subtitle: 'Planes, fiscal y datos de plataforma.' },
];

function SuperAdminRouteHeader({ pathname }: { pathname: string }) {
  const meta = SUPERADMIN_ROUTE_META.find((r) => r.match(pathname));
  if (!meta) return null;
  return <PanelPageHeader title={meta.title} subtitle={meta.subtitle} badge={meta.badge} />;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      navigate('/login');
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (!currentUser) return null;

  const sidebarLinks = [
    { name: 'Dashboard', path: '/superadmin', icon: LayoutDashboard, exact: true },
    { name: 'Empresas', path: '/superadmin/empresas', icon: Building2 },
    { name: 'Facturación SUNAT', path: '/superadmin/facturacion', icon: DollarSign },
    { name: 'Configuración', path: '/superadmin/configuracion', icon: Settings },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <ShieldAlert className="h-6 w-6" />
          <span>Lumina SaaS</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
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
        fixed inset-y-0 left-0 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 lg:fixed lg:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="hidden lg:flex items-center gap-3 text-indigo-300 font-bold text-xl mb-8">
            <ShieldAlert className="h-8 w-8" />
            <div>
              <div>Lumina SaaS</div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Super Admin</div>
            </div>
          </div>
          {currentUser && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Sesión</div>
              <div className="font-bold text-sm truncate">{currentUser.name}</div>
              <div className="text-xs text-indigo-300 truncate">{currentUser.email}</div>
            </div>
          )}
          <nav className="space-y-1 flex-1">
            {sidebarLinks.map(link => (
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
              onClick={() => { storage.setCurrentUser(null); navigate('/'); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-5 w-5" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 lg:ml-64 overflow-y-auto min-h-screen">
        <SuperAdminRouteHeader pathname={location.pathname} />
        <Routes>
          <Route index element={<SuperAdminOverview />} />
          <Route path="empresas" element={<SuperAdminTenants />} />
          <Route path="facturacion" element={<SuperAdminSunatBilling />} />
          <Route path="configuracion" element={<SuperAdminConfig />} />
        </Routes>
      </main>
    </div>
  );
}

function SuperAdminOverview() {
  const tenants = storage.getTenants();
  const platformInvoices = storage.getPlatformInvoices();
  const globalConfig = storage.getGlobalConfig();

  const activeTenants = tenants.filter((t) => t.status === 'Activo').length;
  const mrr = tenants.reduce((sum, t) => (t.status === 'Activo' ? sum + t.monthlyFee : sum), 0);
  const statusCounts = buildTenantStatusCounts(tenants);
  const mrrByPlan = buildMrrByPlan(tenants);
  const billingByMonth = buildPlatformBillingByMonth(platformInvoices);
  const upcoming = getUpcomingBillingTenants(tenants);
  const totalBilled = platformInvoices.reduce((s, i) => s + i.total, 0);

  const planLabels = mrrByPlan.map((p) => p.plan);
  const planMrrValues = mrrByPlan.map((p) => p.mrr);
  const barData = withBarLabels(planLabels, 'MRR por plan (S/)', planMrrValues);

  const planDistribution = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] || 0) + 1;
    return acc;
  }, {});
  const pieData = pieDataset(Object.keys(planDistribution), Object.values(planDistribution));

  const monthLabels = Object.keys(billingByMonth);
  const monthValues = Object.values(billingByMonth);
  const billingBar =
    monthLabels.length > 0
      ? withBarLabels(monthLabels, 'Facturación SaaS (S/)', monthValues)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to="/superadmin/empresas"
          className="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700"
        >
          <PlusCircle className="h-4 w-4" /> Nueva empresa
        </Link>
        <Link
          to="/superadmin/facturacion"
          className="flex items-center gap-2 px-4 h-10 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50"
        >
          <Receipt className="h-4 w-4" /> Facturación
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Empresas activas" value={`${activeTenants}/${tenants.length}`} icon={Building2} tone="indigo" />
        <StatCard label="MRR estimado" value={formatCurrency(mrr)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Comprobantes SUNAT" value={platformInvoices.length} icon={Receipt} tone="amber" />
        <StatCard label="Facturado (simulado)" value={formatCurrency(totalBilled)} icon={DollarSign} tone="slate" />
      </div>

      {(statusCounts.suspendido > 0 || upcoming.length > 0) && (
        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Atención requerida
          </h3>
          {statusCounts.suspendido > 0 && (
            <p className="text-sm text-amber-800">
              {statusCounts.suspendido} empresa(s) suspendida(s).{' '}
              <Link to="/superadmin/empresas" className="font-bold underline">Revisar</Link>
            </p>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Próximos cobros (14 días)</p>
              {upcoming.slice(0, 3).map((t) => (
                <div key={t.id} className="flex justify-between text-sm bg-slate-50 rounded-xl px-4 py-2">
                  <span>{t.name}</span>
                  <span className="font-bold">{format(new Date(t.nextBillingDate), 'dd MMM', { locale: es })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" /> MRR por plan
          </h3>
          <div className="h-64">
            <Bar data={barData} options={barChartOptions} />
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución de planes</h3>
          <div className="h-64">
            {tenants.length > 0 ? (
              <Pie data={pieData} options={pieChartOptions} />
            ) : (
              <EmptyState title="Sin empresas" description="Registra tu primera empresa tenant." actionLabel="Ir a empresas" actionTo="/superadmin/empresas" />
            )}
          </div>
        </div>
      </div>

      {billingBar && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Facturación electrónica mensual</h3>
          <div className="h-64">
            <Bar data={billingBar} options={barChartOptions} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Empresas recientes</h3>
          <div className="space-y-3">
            {[...tenants]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{tenant.name}</div>
                      <div className="text-xs text-slate-500">
                        {tenant.plan} · {formatCurrency(tenant.monthlyFee)}/mes
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      tenant.status === 'Activo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : tenant.status === 'Suspendido'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>
              ))}
            {tenants.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No hay empresas registradas.</p>
            )}
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Últimos comprobantes</h3>
          <div className="space-y-3">
            {platformInvoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">{inv.fullNumber || inv.id}</div>
                  <div className="text-xs text-slate-500">{inv.clientName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatCurrency(inv.total)}</div>
                  <div className="text-[10px] uppercase font-bold text-amber-700">{inv.sunatStatus}</div>
                </div>
              </div>
            ))}
            {platformInvoices.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                Aún no hay comprobantes.{' '}
                <Link to="/superadmin/facturacion" className="text-indigo-600 font-bold">
                  Emitir uno
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuperAdminTenants() {
  const { showToast } = useToast();
  const globalConfig = storage.getGlobalConfig();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [rucValue, setRucValue] = useState('');
  const [rucValidation, setRucValidation] = useState<RucValidationResponse | null>(null);
  const [rucLoading, setRucLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>('Básico');
  const [monthlyFee, setMonthlyFee] = useState(resolvePlanPrice('Básico', globalConfig.plans));
  const [companyName, setCompanyName] = useState('');
  const [showBranding, setShowBranding] = useState(false);

  useEffect(() => {
    setTenants(storage.getTenants());
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const plan = editingTenant?.plan ?? 'Básico';
    setRucValue(editingTenant?.ruc ?? '');
    setCompanyName(editingTenant?.name ?? '');
    setShowBranding(Boolean(editingTenant?.theme?.logoUrl || editingTenant?.theme?.coverUrl));
    setSelectedPlan(plan);
    setMonthlyFee(editingTenant?.monthlyFee ?? resolvePlanPrice(plan, globalConfig.plans));
    if (editingTenant?.ruc && editingTenant.rucStatus === 'activo') {
      setRucValidation({
        valid: true,
        ruc: editingTenant.ruc,
        razonSocial: editingTenant.razonSocial,
        status: 'activo',
        message: 'RUC registrado previamente.',
        simulation: true,
      });
    } else {
      setRucValidation(null);
    }
  }, [isModalOpen, editingTenant, globalConfig.plans]);

  const handleValidateRuc = async () => {
    if (!rucValue.trim()) {
      showToast('Ingrese un RUC de 11 dígitos.', 'error');
      return;
    }
    setRucLoading(true);
    try {
      const result = await validateRuc(rucValue);
      setRucValidation(result);
      if (result.valid && result.razonSocial && !companyName.trim()) {
        setCompanyName(result.razonSocial);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar RUC';
      setRucValidation({
        valid: false,
        ruc: rucValue.replace(/\D/g, ''),
        status: 'no_encontrado',
        message,
        simulation: true,
      });
    } finally {
      setRucLoading(false);
    }
  };

  const handlePlanChange = (plan: TenantPlan) => {
    setSelectedPlan(plan);
    setMonthlyFee(resolvePlanPrice(plan, globalConfig.plans));
  };

  const planPreview = resolvePlanPermissions(selectedPlan, globalConfig.plans);

  const filteredTenants = tenants.filter(t => 
    (t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || t.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (planFilter === 'Todos' || t.plan === planFilter) &&
    (statusFilter === 'Todos' || t.status === statusFilter)
  );

  const totalMrr = filteredTenants.filter(t => t.status === 'Activo').reduce((s, t) => s + t.monthlyFee, 0);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rucValidation?.valid) {
      showToast('Debe validar un RUC activo antes de guardar.', 'error');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const plan = (formData.get('plan') as TenantPlan) || selectedPlan;

    const tenantData: Tenant = enrichTenantWithPlan({
      id: editingTenant?.id || Math.random().toString(36).substr(2, 9),
      name: companyName.trim() || (formData.get('name') as string),
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      ruc: rucValidation.ruc,
      razonSocial: rucValidation.razonSocial,
      rucStatus: rucValidation.status,
      plan,
      status: formData.get('status') as Tenant['status'],
      createdAt: editingTenant?.createdAt || new Date().toISOString(),
      nextBillingDate: editingTenant?.nextBillingDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      monthlyFee: Number(formData.get('monthlyFee') ?? monthlyFee),
      theme: {
        primaryColor: (formData.get('primaryColor') as string) || '#4f46e5',
        logoUrl: (formData.get('logoUrl') as string) || '',
        coverUrl: (formData.get('coverUrl') as string) || ''
      }
    }, plan);

    storage.saveTenant(tenantData);
    setTenants(storage.getTenants());
    setIsModalOpen(false);
    setEditingTenant(null);
    setRucValidation(null);
    showToast(editingTenant ? 'Empresa actualizada.' : 'Empresa creada correctamente.');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta empresa? Esta acción no se puede deshacer.')) {
      storage.deleteTenant(id);
      setTenants(storage.getTenants());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
            <ExportButtons
              onCsv={() =>
                downloadCsv(
                  'empresas_lumina_saas',
                  ['Empresa', 'Contacto', 'Email', 'Plan', 'Estado', 'MRR', 'Registro'],
                  filteredTenants.map((t) => [
                    t.name,
                    t.contactName,
                    t.email,
                    t.plan,
                    t.status,
                    t.monthlyFee,
                    t.createdAt.slice(0, 10),
                  ])
                )
              }
              onExcel={() =>
                downloadExcel(
                  'empresas_lumina_saas.xlsx',
                  'Empresas',
                  filteredTenants.map((t) => ({
                    Empresa: t.name,
                    Contacto: t.contactName,
                    Email: t.email,
                    Teléfono: t.phone,
                    Plan: t.plan,
                    Estado: t.status,
                    MRR: t.monthlyFee,
                    Registro: t.createdAt.slice(0, 10),
                  }))
                )
              }
            />
            <button
              onClick={() => { setEditingTenant(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Nueva empresa
            </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Resultados" value={filteredTenants.length} icon={Building2} tone="indigo" />
        <StatCard label="Activas (filtro)" value={filteredTenants.filter((t) => t.status === 'Activo').length} icon={Check} tone="emerald" />
        <StatCard label="MRR filtrado" value={formatCurrency(totalMrr)} icon={TrendingUp} tone="amber" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, contacto o email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="p-3 bg-white border border-slate-200 rounded-xl min-w-[160px]"
        >
          <option value="Todos">Todos los planes</option>
          <option value="Básico">Básico</option>
          <option value="Pro">Pro</option>
          <option value="Enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 bg-white border border-slate-200 rounded-xl min-w-[160px]"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Suspendido">Suspendido</option>
        </select>
      </div>

      {filteredTenants.length === 0 ? (
        <EmptyState
          title="No se encontraron empresas"
          description="Prueba otros filtros o crea una nueva empresa con el botón superior."
        />
      ) : (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">Empresa</th>
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">Contacto</th>
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">Plan</th>
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">Estado</th>
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider">MRR</th>
                <th className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{tenant.name}</div>
                    <div className="text-xs text-slate-500">RUC: {tenant.ruc || '—'}</div>
                    <div className="text-xs text-slate-500">Registrado: {format(new Date(tenant.createdAt), 'dd MMM yyyy', { locale: es })}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{tenant.contactName}</div>
                    <div className="text-xs text-slate-500">{tenant.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' :
                      tenant.status === 'Suspendido' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-900">
                    {formatCurrency(tenant.monthlyFee)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setEditingTenant(tenant); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tenant.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AppModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTenant(null); setRucValidation(null); }}
        title={editingTenant ? 'Editar empresa' : 'Nueva empresa'}
        subtitle="Registre el tenant, valide el RUC y asigne un plan con permisos."
        badge={<SimulationBadge label="RUC simulado" />}
        footer={
          <ModalActions
            onCancel={() => { setIsModalOpen(false); setEditingTenant(null); }}
            submitLabel={editingTenant ? 'Guardar cambios' : 'Crear empresa'}
            submitForm="tenant-form"
            disabled={!rucValidation?.valid}
          />
        }
      >
        <form id="tenant-form" onSubmit={handleSave} className="space-y-5">
          <FormSection
            title="Identificación fiscal"
            description="Consulta simulada al padrón SUNAT. Obligatorio antes de guardar."
            accent="indigo"
          >
            <FormField
              label="RUC"
              hint={`${rucValue.length}/11 dígitos · Prueba: 10743646881 o 20123456789`}
              required
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  name="ruc"
                  value={rucValue}
                  onChange={(e) => {
                    setRucValue(e.target.value.replace(/\D/g, '').slice(0, 11));
                    setRucValidation(null);
                  }}
                  required
                  maxLength={11}
                  inputMode="numeric"
                  placeholder="20123456789"
                  className={`${formInputClass} font-mono tracking-wide`}
                />
                <button
                  type="button"
                  onClick={handleValidateRuc}
                  disabled={rucLoading || rucValue.length !== 11}
                  className="shrink-0 h-10 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {rucLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Validar
                </button>
              </div>
            </FormField>
            {rucValidation && (
              <div
                className={`flex items-start gap-2.5 text-sm rounded-lg px-3 py-2.5 border ${
                  rucValidation.valid
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}
              >
                {rucValidation.valid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                )}
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{rucValidation.message}</p>
                  {rucValidation.razonSocial && (
                    <p className="text-xs mt-1 opacity-90 truncate">{rucValidation.razonSocial}</p>
                  )}
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Datos de la empresa" accent="slate">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nombre comercial" required className="sm:col-span-2">
                <input
                  name="name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Ej. Lumina Hotel & Spa"
                  className={formInputClass}
                />
              </FormField>
              <FormField label="Contacto" required>
                <input
                  name="contactName"
                  defaultValue={editingTenant?.contactName}
                  required
                  className={formInputClass}
                />
              </FormField>
              <FormField label="Teléfono" required>
                <input
                  name="phone"
                  defaultValue={editingTenant?.phone}
                  required
                  className={formInputClass}
                />
              </FormField>
              <FormField label="Email" required className="sm:col-span-2">
                <input
                  name="email"
                  type="email"
                  defaultValue={editingTenant?.email}
                  required
                  className={formInputClass}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Plan y facturación" description="Los permisos se aplican automáticamente al panel del hotel." accent="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Plan" required>
                <select
                  name="plan"
                  value={selectedPlan}
                  onChange={(e) => handlePlanChange(e.target.value as TenantPlan)}
                  className={formSelectClass}
                >
                  <option value="Básico">Básico</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </FormField>
              <FormField label="Estado" required>
                <select
                  name="status"
                  defaultValue={editingTenant?.status || 'Activo'}
                  className={formSelectClass}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
              </FormField>
              <FormField label="MRR (S/)" required>
                <input
                  name="monthlyFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  required
                  className={formInputClass}
                />
              </FormField>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Permisos incluidos
              </p>
              <PlanPermissionsPreview lines={permissionsSummary(planPreview)} />
            </div>
          </FormSection>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowBranding(!showBranding)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span>Marca blanca (opcional)</span>
              <span className="text-xs text-slate-400">{showBranding ? 'Ocultar' : 'Mostrar'}</span>
            </button>
            {showBranding && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100">
                <FormField label="Color primario">
                  <div className="flex gap-2">
                    <input
                      name="primaryColor"
                      type="color"
                      defaultValue={editingTenant?.theme?.primaryColor || '#4f46e5'}
                      className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      defaultValue={editingTenant?.theme?.primaryColor || '#4f46e5'}
                      className={formInputClass}
                      placeholder="#4f46e5"
                      onChange={(e) => {
                        const colorInput = e.target.previousElementSibling as HTMLInputElement;
                        if (colorInput) colorInput.value = e.target.value;
                      }}
                    />
                  </div>
                </FormField>
                <FormField label="URL logo">
                  <input
                    name="logoUrl"
                    type="url"
                    defaultValue={editingTenant?.theme?.logoUrl}
                    placeholder="https://…"
                    className={formInputClass}
                  />
                </FormField>
                <FormField label="URL portada">
                  <input
                    name="coverUrl"
                    type="url"
                    defaultValue={editingTenant?.theme?.coverUrl}
                    placeholder="https://…"
                    className={formInputClass}
                  />
                </FormField>
              </div>
            )}
          </div>
        </form>
      </AppModal>
    </div>
  );
}

function SuperAdminConfig() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'fiscal'>('general');

  useEffect(() => {
    setConfig(storage.getGlobalConfig());
  }, []);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newConfig: GlobalConfig = {
      platformName: formData.get('platformName') as string,
      platformAddress: (formData.get('platformAddress') as string) || config.platformAddress,
      supportEmail: formData.get('supportEmail') as string,
      supportPhone: formData.get('supportPhone') as string,
      defaultCurrency: formData.get('defaultCurrency') as string,
      fiscal: config.fiscal,
      plans: {
        basic: {
          price: Number(formData.get('basicPrice')),
          maxRooms: Number(formData.get('basicRooms')),
          maxUsers: Number(formData.get('basicUsers'))
        },
        pro: {
          price: Number(formData.get('proPrice')),
          maxRooms: Number(formData.get('proRooms')),
          maxUsers: Number(formData.get('proUsers'))
        },
        enterprise: {
          price: Number(formData.get('enterprisePrice')),
          maxRooms: Number(formData.get('enterpriseRooms')),
          maxUsers: Number(formData.get('enterpriseUsers'))
        }
      }
    };

    storage.saveGlobalConfig(newConfig);
    setConfig(newConfig);
    setIsSaved(true);
    showToast('Configuración global guardada.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const saveFiscal = () => {
    if (!config) return;
    storage.saveGlobalConfig(config);
    setIsSaved(true);
    showToast('Datos fiscales guardados.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (!config) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {isSaved && (
        <div className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-800">
          ✓ Configuración guardada
        </div>
      )}

      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Información General
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Configuración de Planes
        </button>
        <button 
          onClick={() => setActiveTab('fiscal')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'fiscal' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Datos fiscales SUNAT
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {activeTab === 'general' && (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Información de la Plataforma</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre de la Plataforma</label>
                <input
                  name="platformName"
                  defaultValue={config.platformName}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Moneda por Defecto</label>
                <input
                  name="defaultCurrency"
                  defaultValue={config.defaultCurrency}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email de Soporte</label>
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue={config.supportEmail}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Teléfono de Soporte</label>
                <input
                  name="supportPhone"
                  defaultValue={config.supportPhone}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Dirección de la plataforma</label>
                <input
                  name="platformAddress"
                  defaultValue={config.platformAddress || config.fiscal?.domicilioFiscal || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Planes de suscripción</h3>
            {(
              [
                { key: 'basic', title: 'Básico', color: 'text-indigo-600', price: 'basicPrice', rooms: 'basicRooms', users: 'basicUsers', data: config.plans.basic },
                { key: 'pro', title: 'Pro', color: 'text-purple-600', price: 'proPrice', rooms: 'proRooms', users: 'proUsers', data: config.plans.pro },
                { key: 'enterprise', title: 'Enterprise', color: 'text-pink-600', price: 'enterprisePrice', rooms: 'enterpriseRooms', users: 'enterpriseUsers', data: config.plans.enterprise },
              ] as const
            ).map((plan) => (
              <div key={plan.key} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <h4 className={`font-bold text-lg ${plan.color}`}>Plan {plan.title}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Precio mensual (S/)</label>
                    <input name={plan.price} type="number" defaultValue={plan.data.price} className="mt-1 w-full p-3 bg-white border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Máx. habitaciones</label>
                    <input name={plan.rooms} type="number" defaultValue={plan.data.maxRooms} className="mt-1 w-full p-3 bg-white border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Máx. usuarios</label>
                    <input name={plan.users} type="number" defaultValue={plan.data.maxUsers} className="mt-1 w-full p-3 bg-white border border-slate-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fiscal' && (
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
              Emisor electrónico (plataforma SaaS)
            </h3>
            <p className="text-sm text-slate-500">
              Datos del emisor para comprobantes SUNAT en simulación. Modo académico — sin envío real.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">RUC</label>
                <input
                  type="text"
                  maxLength={11}
                  value={config.fiscal?.ruc ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, ruc: e.target.value.replace(/\D/g, '') },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Razón social</label>
                <input
                  type="text"
                  value={config.fiscal?.razonSocial ?? ''}
                  onChange={(e) =>
                    setConfig({ ...config, fiscal: { ...config.fiscal!, razonSocial: e.target.value } })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Serie boleta</label>
                <input
                  type="text"
                  maxLength={4}
                  value={config.fiscal?.boletaSeries ?? 'B001'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, boletaSeries: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Serie factura</label>
                <input
                  type="text"
                  maxLength={4}
                  value={config.fiscal?.facturaSeries ?? 'F001'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, facturaSeries: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl uppercase"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Domicilio fiscal</label>
                <input
                  type="text"
                  value={config.fiscal?.domicilioFiscal ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fiscal: { ...config.fiscal!, domicilioFiscal: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={saveFiscal}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700"
            >
              Guardar datos fiscales
            </button>
          </div>
        )}

        {activeTab !== 'fiscal' && (
        <div className="flex justify-end">
          <button type="submit" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Guardar Cambios
          </button>
        </div>
        )}
      </form>
    </div>
  );
}
