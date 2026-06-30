import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { authService } from '../../services/authService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Statistics state
  const [stats, setStats] = useState({
    entregas: '12.4k',
    disponibilidad: '99.9%',
    cursos: '320'
  });

  // Check for pre-registration errors (e.g., OAuth block)
  useEffect(() => {
    const authError = sessionStorage.getItem('sre_auth_error');
    if (authError) {
      setError(authError);
      sessionStorage.removeItem('sre_auth_error');
    }
  }, []);

  // Load stats from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: entregasCount } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true });

        const { count: cursosCount } = await supabase
          .from('cursos')
          .select('*', { count: 'exact', head: true });

        setStats({
          entregas: entregasCount && entregasCount > 0 ? entregasCount.toLocaleString() : '12.4k',
          disponibilidad: '99.9%',
          cursos: cursosCount && cursosCount > 0 ? cursosCount.toString() : '320'
        });
      } catch (err) {
        console.error('Error fetching database stats, using fallbacks:', err);
      }
    };

    fetchStats();
  }, []);

  // Lockout check
  useEffect(() => {
    const storedLockout = localStorage.getItem('sre_lockout_until');
    const storedAttempts = localStorage.getItem('sre_login_attempts');

    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10));
    }

    if (storedLockout) {
      const lockoutUntil = parseInt(storedLockout, 10);
      if (Date.now() < lockoutUntil) {
        setLockoutTime(lockoutUntil);
      } else {
        localStorage.removeItem('sre_lockout_until');
        localStorage.removeItem('sre_login_attempts');
        setAttempts(0);
      }
    }
  }, []);

  // Countdown lockout state
  useEffect(() => {
    if (lockoutTime === null) return;

    const interval = setInterval(() => {
      if (Date.now() >= lockoutTime) {
        setLockoutTime(null);
        setAttempts(0);
        localStorage.removeItem('sre_lockout_until');
        localStorage.removeItem('sre_login_attempts');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime) return;

    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        localStorage.setItem('sre_login_attempts', nextAttempts.toString());
        await authService.logAuthEvent(email, false, undefined, authError.message);

        if (nextAttempts >= 5) {
          const until = Date.now() + 15 * 60 * 1000;
          setLockoutTime(until);
          localStorage.setItem('sre_lockout_until', until.toString());
          setError('Cuenta bloqueada temporalmente por 15 minutos debido a demasiados intentos fallidos.');
        } else {
          setError(`Credenciales inválidas. Intentos restantes: ${5 - nextAttempts}`);
        }
      } else if (data.user) {
        setAttempts(0);
        localStorage.removeItem('sre_login_attempts');
        localStorage.removeItem('sre_lockout_until');
        await authService.logAuthEvent(email, true, data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (authError) {
        setError(authError.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error en Google Sign In.');
    }
  };

  const getLockoutRemainingMinutes = () => {
    if (!lockoutTime) return 0;
    const diff = lockoutTime - Date.now();
    return Math.ceil(diff / 60000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B1E14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Left Column (Brand banner and statistics) */}
      <div className="relative lg:w-3/5 p-8 lg:p-16 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0D2A1C] via-[#081B11] to-[#040C07]">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-emerald-700/10 blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 text-lg font-bold tracking-wider text-emerald-400 z-10 animate-fade-in">
          <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40 backdrop-blur-md">
            <Shield size={24} className="text-emerald-400" />
          </div>
          <span className="font-extrabold text-white">SRE-URP</span>
        </div>

        {/* Content Body */}
        <div className="my-16 lg:my-auto max-w-2xl z-10 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Sistema de Registro de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500">
              Entregables Académicos
            </span>
          </h1>
          <p className="text-base lg:text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
            Plataforma institucional de la Universidad Ricardo Palma para la gestión, control y auditoría inmutable de entregas en la nube.
          </p>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-emerald-900/40 max-w-lg">
            <div className="space-y-1">
              <span className="block text-2xl lg:text-3xl font-extrabold text-white">{stats.entregas}</span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Entregas</span>
            </div>
            <div className="space-y-1">
              <span className="block text-2xl lg:text-3xl font-extrabold text-white">{stats.disponibilidad}</span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Uptime</span>
            </div>
            <div className="space-y-1">
              <span className="block text-2xl lg:text-3xl font-extrabold text-white">{stats.cursos}</span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Cursos</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 font-medium z-10">
          © {new Date().getFullYear()} Universidad Ricardo Palma. Coordinación de Arquitectura de Software.
        </div>
      </div>

      {/* Right Column (Login form area) */}
      <div className="lg:w-2/5 p-6 lg:p-12 flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md bg-slate-800/40 border border-slate-700/40 backdrop-blur-xl p-8 lg:p-10 rounded-2xl shadow-2xl flex flex-col space-y-6">
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Iniciar sesión</h2>
            <p className="text-sm text-slate-400">
              Usa tus credenciales oficiales de la universidad.
            </p>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl border border-slate-200 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
            onClick={handleGoogleLogin}
            disabled={!!lockoutTime || loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Iniciar con Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-[1px] bg-slate-700/60" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">o con contraseña</span>
            <div className="flex-1 h-[1px] bg-slate-700/60" />
          </div>

          {/* Form */}
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email institucional</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><Mail size={18} /></span>
                <input
                  type="email"
                  placeholder="ejemplo@urp.edu.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!lockoutTime || loading}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Contraseña</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><Lock size={18} /></span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!!lockoutTime || loading}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-xs text-red-400 leading-relaxed font-semibold">
                <span>{error}</span>
                {lockoutTime && (
                  <span className="block mt-1 font-bold">Intenta de nuevo en: {getLockoutRemainingMinutes()} min</span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!!lockoutTime || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-900/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
};

export default Login;
