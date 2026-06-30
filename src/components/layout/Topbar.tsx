import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from 'lucide-react';

const Topbar: React.FC = () => {
  const { perfil, rol } = useAuth();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter((n) => n)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  const getPortalTitle = () => {
    switch (rol) {
      case 'alumno':
        return 'Portal del Estudiante';
      case 'profesor':
        return 'Portal del Docente';
      case 'administrador':
        return 'Portal de Administración';
      default:
        return 'SRE-URP';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between transition-all duration-200">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full">
          {getPortalTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-6">
        {perfil && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-1.5 pr-4 hover:shadow-sm transition-all duration-200">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center font-bold tracking-wider text-sm shadow-sm">
              {getInitials(perfil.nombre_completo)}
            </div>
            
            {/* User Info */}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {perfil.nombre_completo}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {rol === 'administrador' ? 'Admin' : rol}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
