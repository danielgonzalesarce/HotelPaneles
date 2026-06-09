import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { storage } from './storage';
import type { User } from '../types';
import { buildAvatarFromName, extractGoogleAvatar } from '../utils/userAvatar';

/** Correos con acceso a paneles administrativos (Google OAuth y login local). */
const ROLE_BY_EMAIL: Record<string, User['role']> = {
  'daniel.gonzales.a@tecsup.edu.pe': 'super_admin',
  'alexanderarcedaniel@gmail.com': 'admin',
};

export const GOOGLE_AUTH_MESSAGE = 'LUMINA_GOOGLE_AUTH';

export type GoogleAuthMessage =
  | { type: typeof GOOGLE_AUTH_MESSAGE; success: true; path: string }
  | { type: typeof GOOGLE_AUTH_MESSAGE; success: false; error: string };

export function resolveRoleForEmail(email: string): User['role'] {
  return ROLE_BY_EMAIL[email.toLowerCase().trim()] ?? 'user';
}

function resolveDisplayName(supabaseUser: SupabaseUser, fallback?: string): string {
  const meta = supabaseUser.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    fallback ||
    supabaseUser.email?.split('@')[0] ||
    'Usuario'
  );
}

export function mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): User {
  const email = (supabaseUser.email ?? '').toLowerCase();
  const existing = storage.getUsers().find((u) => u.email.toLowerCase() === email);

  const appUser: User = {
    id: existing?.id ?? supabaseUser.id,
    email: supabaseUser.email ?? existing?.email ?? '',
    name: resolveDisplayName(supabaseUser, existing?.name),
    phone: existing?.phone ?? supabaseUser.user_metadata?.phone ?? '',
    avatarUrl:
      extractGoogleAvatar(supabaseUser.user_metadata as Record<string, unknown>) ??
      existing?.avatarUrl ??
      buildAvatarFromName(resolveDisplayName(supabaseUser, existing?.name)),
    role: resolveRoleForEmail(email),
  };

  if (existing) {
    storage.updateUser({ ...existing, ...appUser, id: existing.id });
  } else {
    storage.saveUser(appUser);
  }

  return appUser;
}

function openCenteredPopup(url: string, name: string, w: number, h: number): Window | null {
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;
  const left = dualScreenLeft + (width - w) / 2;
  const top = dualScreenTop + (height - h) / 2;

  return window.open(
    url,
    name,
    `scrollbars=yes,width=${w},height=${h},top=${top},left=${left},popup=yes`
  );
}

/** Inicia sesión con Google en ventana emergente (sin salir de la página). */
export function signInWithGooglePopup(): Promise<{ path: string }> {
  if (!isSupabaseConfigured()) {
    return Promise.reject(new Error('Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar Google.'));
  }

  return new Promise(async (resolve, reject) => {
    const redirectTo = `${window.location.origin}/auth/callback?popup=1`;

    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      reject(error);
      return;
    }

    if (!data?.url) {
      reject(new Error('No se pudo iniciar el flujo de Google.'));
      return;
    }

    const popup = openCenteredPopup(data.url, 'lumina-google-auth', 480, 640);

    if (!popup) {
      reject(
        new Error(
          'El navegador bloqueó la ventana emergente. Permite popups para localhost e inténtalo de nuevo.'
        )
      );
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closedPoll);
    };

    const finish = (result: { path: string } | null, err?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      if (result) resolve(result);
      else reject(err ?? new Error('Inicio de sesión cancelado.'));
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as GoogleAuthMessage;
      if (payload?.type !== GOOGLE_AUTH_MESSAGE) return;

      if (payload.success === false) {
        finish(null, new Error(payload.error || 'Error al iniciar sesión con Google.'));
        return;
      }
      finish({ path: payload.path });
    };

    window.addEventListener('message', onMessage);

    const closedPoll = window.setInterval(() => {
      if (popup.closed && !settled) {
        finish(null, new Error('Ventana de Google cerrada antes de completar el inicio de sesión.'));
      }
    }, 400);
  });
}

/** @deprecated Usar signInWithGooglePopup — mantiene compatibilidad con redirect completo. */
export async function signInWithGoogle(): Promise<void> {
  await signInWithGooglePopup();
}

export async function signOutAuth(): Promise<void> {
  if (isSupabaseConfigured()) {
    await getSupabase().auth.signOut();
  }
  storage.setCurrentUser(null);
}

export async function getActiveSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function syncSessionToAppUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  const appUser = mapSupabaseUserToAppUser(session.user);
  storage.setCurrentUser(appUser);
  return appUser;
}

export function getDashboardPathForRole(role: User['role']): string {
  if (role === 'super_admin') return '/superadmin';
  if (role === 'admin') return '/admin';
  return '/user';
}

export function isGoogleAuthAvailable(): boolean {
  return isSupabaseConfigured();
}

export function isAuthPopupMode(): boolean {
  return new URLSearchParams(window.location.search).get('popup') === '1';
}

export function notifyAuthPopupParent(path: string): void {
  if (window.opener && !window.opener.closed) {
    const message: GoogleAuthMessage = {
      type: GOOGLE_AUTH_MESSAGE,
      success: true,
      path,
    };
    window.opener.postMessage(message, window.location.origin);
  }
}

export function notifyAuthPopupError(error: string): void {
  if (window.opener && !window.opener.closed) {
    const message: GoogleAuthMessage = {
      type: GOOGLE_AUTH_MESSAGE,
      success: false,
      error,
    };
    window.opener.postMessage(message, window.location.origin);
  }
}
