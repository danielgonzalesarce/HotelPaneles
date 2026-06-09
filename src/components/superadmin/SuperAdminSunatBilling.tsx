import React, { useEffect, useState } from 'react';
import { Plus, Download, Printer, Receipt, DollarSign, Building2 } from 'lucide-react';
import { storage } from '../../services/storage';
import type { Tenant, Invoice, ClientDocumentType, PaymentMethod } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { downloadCsv, downloadExcel } from '../../utils/exportData';
import { generateElectronicInvoicePdf } from '../../utils/electronicInvoicePdf';
import {
  buildTenantElectronicPayload,
  payloadToInvoice,
  BOLETA_DNI_REQUIRED_FROM,
  getDefaultSeries,
  globalConfigToHotelConfig,
} from '../../utils/invoiceHelpers';
import { emitSunatComprobante, getSunatStatus } from '../../services/sunatService';
import ExportButtons from '../admin/ExportButtons';
import { SimulationBadge, StatCard, EmptyState, AppModal, FormSection, FormField, formInputClass, formSelectClass, ModalActions, PlanPermissionsPreview } from './SuperAdminUi';
import { useToast } from '../../context/ToastContext';

export default function SuperAdminSunatBilling() {
  const { showToast } = useToast();
  const globalConfig = storage.getGlobalConfig();
  const issuerConfig = globalConfigToHotelConfig(globalConfig);
  const [tenants] = useState<Tenant[]>(storage.getTenants().filter((t) => t.status === 'Activo'));
  const [invoices, setInvoices] = useState<Invoice[]>(storage.getPlatformInvoices());
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [invoiceType, setInvoiceType] = useState<'Boleta' | 'Factura'>('Factura');
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientDocType, setClientDocType] = useState<ClientDocumentType>('RUC');
  const [clientAddress, setClientAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Contado');
  const [creditPending, setCreditPending] = useState('');
  const [seriesCode, setSeriesCode] = useState(getDefaultSeries('Factura', issuerConfig));
  const [amount, setAmount] = useState('');
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

  useEffect(() => {
    getSunatStatus().then(setSunatInfo).catch(() => undefined);
  }, []);

  const openModal = (tenant?: Tenant) => {
    const t = tenant ?? tenants[0] ?? null;
    setSelectedTenant(t);
    if (t) {
      setClientName(t.name);
      setClientDoc('');
      setClientDocType('RUC');
      setClientAddress('');
      setPaymentMethod('Contado');
      setCreditPending('');
      setInvoiceType('Factura');
      setSeriesCode(getDefaultSeries('Factura', issuerConfig));
      setAmount(String(t.monthlyFee));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTenant) return;
    const total = Number(amount) || selectedTenant.monthlyFee;
    if (total <= 0) {
      showToast('Indique un monto válido.', 'error');
      return;
    }

    setIsEmitting(true);
    try {
      const payload = buildTenantElectronicPayload(
        selectedTenant,
        total,
        globalConfig,
        {
          type: invoiceType,
          series: seriesCode.trim().toUpperCase(),
          clientName: clientName.trim() || selectedTenant.name,
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
        showToast(result.message || 'No se pudo emitir el comprobante.', 'error');
        return;
      }

      const newInvoice = payloadToInvoice(payload, result);
      storage.savePlatformInvoice(newInvoice);
      setInvoices(storage.getPlatformInvoices());
      setSelectedTenant(null);
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
    generateElectronicInvoicePdf(invoice, issuerConfig).save(`${invoice.fullNumber || invoice.id}.pdf`);
  };

  const printInvoice = (invoice: Invoice) => {
    const url = generateElectronicInvoicePdf(invoice, issuerConfig).output('bloburl');
    window.open(url, '_blank');
  };

  const statusColor = (status: Invoice['sunatStatus']) => {
    switch (status) {
      case 'aceptado':
        return 'bg-emerald-100 text-emerald-700';
      case 'simulado':
        return 'bg-amber-100 text-amber-700';
      case 'rechazado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const previewTotal = Number(amount) || selectedTenant?.monthlyFee || 0;
  const requiresDni = invoiceType === 'Boleta' && previewTotal > BOLETA_DNI_REQUIRED_FROM;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        <ExportButtons
          onCsv={() =>
            downloadCsv(
              'comprobantes_saas',
              ['Número', 'Tipo', 'Empresa', 'Documento', 'Plan', 'Gravado', 'IGV', 'Total', 'Estado', 'Fecha'],
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
            )
          }
          onExcel={() =>
            downloadExcel(
              'comprobantes_saas.xlsx',
              'Comprobantes SaaS',
              invoices.map((inv) => ({
                Número: inv.fullNumber || inv.id,
                Tipo: inv.type,
                Empresa: inv.clientName,
                Documento: inv.clientDocument,
                Plan: inv.roomNumber,
                Gravado: inv.taxableAmount,
                IGV: inv.igv,
                Total: inv.total,
                Estado: inv.sunatStatus,
                Fecha: inv.emissionDate || inv.date,
              }))
            )
          }
        />
        <button
          onClick={() => openModal()}
          disabled={tenants.length === 0}
          className="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Emitir comprobante
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Comprobantes emitidos" value={invoices.length} icon={Receipt} tone="indigo" />
        <StatCard label="Total facturado (con IGV)" value={formatCurrency(totalInvoiced)} icon={DollarSign} tone="emerald" />
        <StatCard label="Empresas activas" value={tenants.length} icon={Building2} tone="amber" />
      </div>

      <AppModal
        open={Boolean(selectedTenant)}
        onClose={() => setSelectedTenant(null)}
        title={`Emitir ${invoiceType} · SaaS`}
        subtitle="Comprobante simulado para cobro de suscripción a tenants."
        badge={<SimulationBadge />}
        footer={
          <ModalActions
            onCancel={() => setSelectedTenant(null)}
            submitLabel={isEmitting ? 'Generando…' : 'Generar comprobante'}
            submitType="button"
            onSubmit={handleGenerate}
            loading={isEmitting}
          />
        }
      >
        {selectedTenant && (
          <div className="space-y-5">
            <FormSection title="Cliente (tenant)" accent="indigo">
              <FormField label="Empresa">
                <select
                  className={formSelectClass}
                  value={selectedTenant.id}
                  onChange={(e) => {
                    const t = tenants.find((x) => x.id === e.target.value) || null;
                    setSelectedTenant(t);
                    if (t) {
                      setClientName(t.name);
                      setAmount(String(t.monthlyFee));
                    }
                  }}
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.plan} · {formatCurrency(t.monthlyFee)}/mes
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
                        setSeriesCode(getDefaultSeries(t, issuerConfig));
                        if (t === 'Factura') setClientDocType('RUC');
                      }}
                      className={`h-10 rounded-lg text-sm font-semibold border transition-all ${
                        invoiceType === t
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Serie" hint="Simulación: F001 o B001.">
                <input
                  type="text"
                  maxLength={4}
                  className={`${formInputClass} uppercase font-mono`}
                  value={seriesCode}
                  onChange={(e) => setSeriesCode(e.target.value.toUpperCase().slice(0, 4))}
                />
              </FormField>
            </FormSection>

            <FormSection title="Datos del comprador" accent="emerald">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Razón social" className="sm:col-span-2">
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
                  hint={requiresDni ? 'Obligatorio para montos > S/ 700' : undefined}
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
                <FormField label="Monto suscripción (S/)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={formInputClass}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </FormField>
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
              </div>
              {previewTotal > 0 && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-sm text-indigo-900">
                  Total con IGV: <strong>{formatCurrency(previewTotal)}</strong>
                  <span className="text-indigo-700/80">
                    {' '}
                    · Gravado {formatCurrency(previewTotal / 1.18)} · IGV{' '}
                    {formatCurrency(previewTotal - previewTotal / 1.18)}
                  </span>
                </div>
              )}
            </FormSection>
          </div>
        )}
      </AppModal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
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
                <div className="text-sm font-bold">{formatCurrency(inv.total)}</div>
                <div className="text-[10px] text-slate-400">IGV {formatCurrency(inv.igv)}</div>
                <div className="text-[10px] text-slate-400">{inv.emissionDate || inv.date}</div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-1">
              <div className="text-sm font-medium text-slate-700">{inv.clientName}</div>
              <div className="text-xs text-slate-400">
                {inv.clientDocumentType}: {inv.clientDocument || '—'} · {inv.roomNumber}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => downloadPDF(inv)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                <Download className="h-4 w-4" /> PDF
              </button>
              <button
                onClick={() => printInvoice(inv)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-500 bg-white rounded-[2rem] border border-slate-200">
            No hay comprobantes SaaS emitidos. Use &quot;Emitir comprobante&quot; para generar uno en simulación.
          </div>
        )}
      </div>
    </div>
  );
}
