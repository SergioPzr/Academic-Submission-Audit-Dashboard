import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateDomain } from '../../utils/validators';
import { cn } from '../../utils/cn';

export default function AuthPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!validateDomain(email)) {
      setError('Solo se permiten correos institucionales @urp.edu.pe');
      return;
    }
    setError(null);
    setIsLoggingIn(true);
    try {
      await login();
    } catch {
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">
            📚
          </div>
          <h1 className="text-2xl font-bold text-text-1">EduTrack</h1>
          <p className="text-text-3 mt-1">Sistema de Entregables Académicos</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-2 mb-1.5">
              Correo institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="usuario@urp.edu.pe"
              className={cn(
                'w-full px-4 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                'focus:border-indigo focus:ring-3 focus:ring-indigo/10',
                error ? 'border-red' : 'border-border-mid'
              )}
            />
            {error && <p className="text-red text-xs mt-1.5">{error}</p>}
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn || !email}
            className="w-full py-2.5 bg-indigo text-white rounded-lg font-medium text-sm hover:bg-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <span className="animate-pulse">Iniciando sesión...</span>
            ) : (
              <>
                <span>🔑</span> Iniciar sesión con Google
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-text-3 mt-6">
          Solo accesible con credenciales institucionales URP
        </p>
      </div>
    </div>
  );
}
