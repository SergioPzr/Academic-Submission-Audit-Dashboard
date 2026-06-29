import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../lib/types';

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setProfile({
            id: session.user.id,
            email: session.user.email ?? '',
            full_name: session.user.user_metadata?.full_name ?? '',
            role: (session.user.user_metadata?.role as UserRole) ?? 'alumno',
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setProfile({
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.user_metadata?.full_name ?? '',
          role: (session.user.user_metadata?.role as UserRole) ?? 'alumno',
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => { subscription?.unsubscribe(); };
  }, []);

  const login = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{ profile, isLoading, isAuthenticated: !!profile, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
