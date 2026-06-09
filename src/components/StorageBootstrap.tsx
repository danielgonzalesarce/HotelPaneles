import { useEffect } from 'react';
import { initStorage } from '../services/storage';
import { isSupabaseConfigured } from '../lib/supabase';

interface StorageBootstrapProps {
  children: React.ReactNode;
}

/** Inicializa datos en segundo plano sin bloquear ni mostrar mensajes técnicos. */
export default function StorageBootstrap({ children }: StorageBootstrapProps) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    initStorage().catch((err) => {
      console.error('[Storage init]', err);
    });
  }, []);

  return <>{children}</>;
}
