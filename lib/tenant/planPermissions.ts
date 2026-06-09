export type TenantPlan = "Básico" | "Pro" | "Enterprise";

export interface TenantPermissions {
  maxRooms: number;
  maxUsers: number;
  billing: boolean;
  advancedReports: boolean;
  chatbot: boolean;
  multiSite: boolean;
}

export interface PlanLimits {
  price: number;
  maxRooms: number;
  maxUsers: number;
}

const FEATURE_MATRIX: Record<
  TenantPlan,
  Omit<TenantPermissions, "maxRooms" | "maxUsers">
> = {
  Básico: {
    billing: false,
    advancedReports: false,
    chatbot: false,
    multiSite: false,
  },
  Pro: {
    billing: true,
    advancedReports: true,
    chatbot: true,
    multiSite: false,
  },
  Enterprise: {
    billing: true,
    advancedReports: true,
    chatbot: true,
    multiSite: true,
  },
};

const DEFAULT_LIMITS: Record<TenantPlan, PlanLimits> = {
  Básico: { price: 99, maxRooms: 10, maxUsers: 2 },
  Pro: { price: 199, maxRooms: 50, maxUsers: 10 },
  Enterprise: { price: 499, maxRooms: 999, maxUsers: 999 },
};

export function planToConfigKey(plan: TenantPlan): "basic" | "pro" | "enterprise" {
  if (plan === "Básico") return "basic";
  if (plan === "Pro") return "pro";
  return "enterprise";
}

export function resolvePlanPermissions(
  plan: TenantPlan,
  globalPlans?: {
    basic: PlanLimits;
    pro: PlanLimits;
    enterprise: PlanLimits;
  }
): TenantPermissions {
  const key = planToConfigKey(plan);
  const limits = globalPlans?.[key] ?? DEFAULT_LIMITS[plan];
  return {
    maxRooms: limits.maxRooms,
    maxUsers: limits.maxUsers,
    ...FEATURE_MATRIX[plan],
  };
}

export function resolvePlanPrice(
  plan: TenantPlan,
  globalPlans?: {
    basic: PlanLimits;
    pro: PlanLimits;
    enterprise: PlanLimits;
  }
): number {
  const key = planToConfigKey(plan);
  return globalPlans?.[key]?.price ?? DEFAULT_LIMITS[plan].price;
}

export function permissionsSummary(permissions: TenantPermissions): string[] {
  const lines = [
    `Habitaciones: hasta ${permissions.maxRooms}`,
    `Usuarios admin: hasta ${permissions.maxUsers}`,
    `Facturación SUNAT: ${permissions.billing ? "Sí" : "No"}`,
    `Reportes avanzados: ${permissions.advancedReports ? "Sí" : "No"}`,
    `Chatbot Valentina: ${permissions.chatbot ? "Sí" : "No"}`,
    `Multi-sede: ${permissions.multiSite ? "Sí" : "No"}`,
  ];
  return lines;
}
