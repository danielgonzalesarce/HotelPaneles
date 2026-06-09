import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { storage } from './services/storage';
import { isSupabaseConfigured, getSupabase } from './lib/supabase';
import {
  signInWithGooglePopup,
  signOutAuth,
  mapSupabaseUserToAppUser,
  getActiveSession,
  syncSessionToAppUser,
} from './services/authService';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  authReady: boolean;
  signInWithGoogle: () => Promise<{ path: string }>;
  signOut: () => Promise<void>;
  isGoogleAuthEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => storage.getCurrentUser());
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured());

  const setCurrentUser = useCallback((user: User | null) => {
    storage.setCurrentUser(user);
    setCurrentUserState(user);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setCurrentUser(appUser);
      } else {
        const localUser = storage.getCurrentUser();
        if (localUser) setCurrentUserState(localUser);
      }
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setCurrentUser(appUser);
      }

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setCurrentUser]);

  const signInWithGoogle = useCallback(async () => {
    const { path } = await signInWithGooglePopup();
    const session = await getActiveSession();
    if (session?.user) {
      const appUser = await syncSessionToAppUser(session);
      if (appUser) setCurrentUser(appUser);
    }
    return { path };
  }, [setCurrentUser]);

  const signOut = useCallback(async () => {
    await signOutAuth();
    setCurrentUser(null);
  }, [setCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        authReady,
        signInWithGoogle,
        signOut,
        isGoogleAuthEnabled: isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
