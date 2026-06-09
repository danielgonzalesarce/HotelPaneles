import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant } from './types';
import { storage } from './services/storage';

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  availableTenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    const tenants = storage.getTenants();
    setAvailableTenants(tenants);
    const lumina = tenants[0] ?? null;
    if (lumina) {
      setCurrentTenant(lumina);
      localStorage.setItem('active_tenant_id', lumina.id);
    }
  }, []);

  // Efecto para aplicar el color primario dinámicamente
  useEffect(() => {
    if (currentTenant?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', currentTenant.theme.primaryColor);
      document.documentElement.style.setProperty('--color-primary-dark', currentTenant.theme.primaryColor);
    } else {
      document.documentElement.style.setProperty('--color-primary', '#2d4a3e');
      document.documentElement.style.setProperty('--color-primary-dark', '#1e3329');
    }
  }, [currentTenant]);

  const handleSetTenant = (tenant: Tenant | null) => {
    setCurrentTenant(tenant);
    if (tenant) {
      localStorage.setItem('active_tenant_id', tenant.id);
    } else {
      localStorage.removeItem('active_tenant_id');
    }
  };

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant: handleSetTenant, availableTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
