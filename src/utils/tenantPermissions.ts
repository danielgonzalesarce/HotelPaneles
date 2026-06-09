import type { Tenant, User } from "../types";
import {
  resolvePlanPermissions,
  type TenantPermissions,
  type TenantPlan,
} from "../../lib/tenant/planPermissions.js";
import { storage } from "../services/storage";

export type AdminFeatureKey =
  | "dashboard"
  | "rooms"
  | "calendar"
  | "control"
  | "billing"
  | "reports"
  | "gallery"
  | "complaints"
  | "reviews"
  | "config";

const ADMIN_FEATURE_MAP: Record<AdminFeatureKey, keyof TenantPermissions | null> = {
  dashboard: null,
  rooms: null,
  calendar: null,
  control: null,
  billing: "billing",
  reports: "advancedReports",
  gallery: null,
  complaints: null,
  reviews: null,
  config: null,
};

export function getTenantPermissions(tenant: Tenant | null | undefined): TenantPermissions {
  if (!tenant) {
    return resolvePlanPermissions("Pro", storage.getGlobalConfig().plans);
  }
  if (tenant.permissions) return tenant.permissions;
  return resolvePlanPermissions(tenant.plan, storage.getGlobalConfig().plans);
}

export function getTenantForAdminUser(user: User | null): Tenant | null {
  if (!user) return null;
  const tenants = storage.getTenants();
  if (user.tenantId) {
    return tenants.find((t) => t.id === user.tenantId) ?? null;
  }
  return tenants.find((t) => t.email === user.email) ?? tenants.find((t) => t.id === "1") ?? null;
}

export function isAdminFeatureAllowed(
  feature: AdminFeatureKey,
  permissions: TenantPermissions
): boolean {
  const permKey = ADMIN_FEATURE_MAP[feature];
  if (!permKey) return true;
  return Boolean(permissions[permKey]);
}

export function adminPathToFeature(path: string): AdminFeatureKey | null {
  if (path === "/admin" || path === "/admin/") return "dashboard";
  if (path.startsWith("/admin/habitaciones")) return "rooms";
  if (path.startsWith("/admin/calendario")) return "calendar";
  if (path.startsWith("/admin/control")) return "control";
  if (path.startsWith("/admin/facturacion")) return "billing";
  if (path.startsWith("/admin/reportes")) return "reports";
  if (path.startsWith("/admin/galeria")) return "gallery";
  if (path.startsWith("/admin/reclamaciones")) return "complaints";
  if (path.startsWith("/admin/reseñas")) return "reviews";
  if (path.startsWith("/admin/configuracion")) return "config";
  return null;
}

export function isAdminPathAllowed(path: string, permissions: TenantPermissions): boolean {
  const feature = adminPathToFeature(path);
  if (!feature) return true;
  return isAdminFeatureAllowed(feature, permissions);
}

export function enrichTenantWithPlan(tenant: Tenant, plan?: TenantPlan): Tenant {
  const nextPlan = plan ?? tenant.plan;
  const globalPlans = storage.getGlobalConfig().plans;
  return {
    ...tenant,
    plan: nextPlan,
    permissions: resolvePlanPermissions(nextPlan, globalPlans),
  };
}
