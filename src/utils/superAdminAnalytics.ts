import type { Invoice, Tenant } from '../types';

export function buildMrrByPlan(tenants: Tenant[]) {
  const plans = ['Básico', 'Pro', 'Enterprise'] as const;
  return plans.map((plan) => ({
    plan,
    mrr: tenants
      .filter((t) => t.status === 'Activo' && t.plan === plan)
      .reduce((sum, t) => sum + t.monthlyFee, 0),
    count: tenants.filter((t) => t.plan === plan).length,
  }));
}

export function buildTenantStatusCounts(tenants: Tenant[]) {
  return {
    activo: tenants.filter((t) => t.status === 'Activo').length,
    inactivo: tenants.filter((t) => t.status === 'Inactivo').length,
    suspendido: tenants.filter((t) => t.status === 'Suspendido').length,
  };
}

export function buildPlatformBillingByMonth(invoices: Invoice[]) {
  const monthly: Record<string, number> = {};
  for (const inv of invoices) {
    const key = (inv.emissionDate || inv.date || '').slice(0, 7);
    if (!key) continue;
    monthly[key] = (monthly[key] ?? 0) + inv.total;
  }
  return Object.fromEntries(
    Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b))
  );
}

export function getUpcomingBillingTenants(tenants: Tenant[], withinDays = 14) {
  const now = Date.now();
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return tenants
    .filter((t) => t.status === 'Activo')
    .filter((t) => {
      const d = new Date(t.nextBillingDate).getTime();
      return d >= now && d <= limit;
    })
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
}
