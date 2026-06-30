import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export interface UserPerfil {
  id: string;
  nombre_completo: string;
  codigo_institucional: string | null;
  email: string;
  id_rol: string;
  facultad: string | null;
  estado: string;
  roles: {
    nombre: string;
  } | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: UserPerfil | null;
  rol: 'alumno' | 'profesor' | 'administrador' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<UserPerfil | null>(null);
  const [rol, setRol] = useState<'alumno' | 'profesor' | 'administrador' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, roles(nombre)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setPerfil(null);
        setRol(null);
      } else if (data) {
        const userPerfil = data as unknown as UserPerfil;
        setPerfil(userPerfil);
        setRol((userPerfil.roles?.nombre as any) || null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err);
      setPerfil(null);
      setRol(null);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfil(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        setLoading(true);
        await fetchPerfil(newSession.user.id);
        setLoading(false);
      } else {
        setPerfil(null);
        setRol(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPerfil(null);
    setRol(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, perfil, rol, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
