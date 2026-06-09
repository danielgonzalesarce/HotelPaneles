import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import {
  getActiveSession,
  getDashboardPathForRole,
  isAuthPopupMode,
  isGoogleAuthAvailable,
  notifyAuthPopupError,
  notifyAuthPopupParent,
  syncSessionToAppUser,
} from '../services/authService';
import { getSupabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const popupMode = isAuthPopupMode();

  useEffect(() => {
    if (!isGoogleAuthAvailable()) {
      if (popupMode) {
        notifyAuthPopupError('Supabase no configurado.');
        window.close();
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }

    let cancelled = false;

    async function finishSignIn() {
      try {
        const supabase = getSupabase();

        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const session = await getActiveSession();
        if (cancelled) return;

        if (session?.user) {
          const appUser = await syncSessionToAppUser(session);
          if (appUser) {
            const path = getDashboardPathForRole(appUser.role);

            if (popupMode) {
              setCurrentUser(appUser);
              notifyAuthPopupParent(path);
              window.close();
              return;
            }

            setCurrentUser(appUser);
            navigate(path, { replace: true });
            return;
          }
        }

        if (popupMode) {
          notifyAuthPopupError('No se pudo completar la sesión.');
          window.close();
        } else {
          navigate('/login?error=google', { replace: true });
        }
      } catch {
        if (cancelled) return;
        if (popupMode) {
          notifyAuthPopupError('Error al iniciar sesión con Google.');
          window.close();
        } else {
          navigate('/login?error=google', { replace: true });
        }
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [navigate, popupMode, setCurrentUser]);

  if (popupMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
        <p className="text-sm text-slate-600 font-medium text-center">Conectando tu cuenta Google…</p>
        <p className="text-xs text-slate-400 text-center">Esta ventana se cerrará sola.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      <p className="text-sm text-slate-600 font-medium">Completando inicio de sesión con Google…</p>
    </div>
  );
}
