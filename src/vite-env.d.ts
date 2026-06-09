/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** true = chat web usa n8n (requiere N8N_WEBHOOK_URL en el servidor) */
  readonly VITE_USE_N8N_RECEPTIONIST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
