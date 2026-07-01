import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import NavItem from './NavItem';
import { LogOut, BookOpen, X } from 'lucide-react';

const NAV_ITEMS = {
  alumno: [
    { label: 'Mis entregables', path: '/alumno', icon: 'LayoutGrid' },
    { label: 'Historial',       path: '/alumno/historial', icon: 'History' },
    { label: 'Cronograma',      path: '/alumno/cronograma', icon: 'Calendar' },
  ],
  profesor: [
    { label: 'Mis cursos',     path: '/profesor', icon: 'BookOpen' },
    { label: 'Monitor en vivo', path: '/profesor/monitor', icon: 'Activity' },
    { label: 'Calificación',   path: '/profesor/calificacion', icon: 'ClipboardCheck' },
    { label: 'Cronograma',     path: '/profesor/cronograma', icon: 'Calendar' },
  ],
  administrador: [
    { label: 'Panel general',  path: '/admin', icon: 'BarChart2' },
    { label: 'Usuarios & Cursos', path: '/admin/usuarios', icon: 'Users' },
    { label: 'Log de auditoría', path: '/admin/auditoria', icon: 'Shield' },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { rol, signOut } = useAuth();
  const items = rol && NAV_ITEMS[rol] ? NAV_ITEMS[rol] : [];

  return (
    <aside className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-[260px] bg-[#0A1F14] text-slate-300 flex flex-col h-screen shrink-0 border-r border-emerald-950/40 select-none transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      
      {/* Sidebar Logo / Header */}
      <div className="h-[70px] border-b border-emerald-950/40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/30">
            <BookOpen className="text-emerald-400 w-5 h-5" />
          </div>
          <span className="font-extrabold text-white tracking-widest text-lg">SRE-URP</span>
        </div>

        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-900/30 transition cursor-pointer"
          title="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <NavItem
            key={item.path}
            label={item.label}
            path={item.path}
            icon={item.icon}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Footer / Log out */}
      <div className="p-4 border-t border-emerald-950/40 bg-[#07170E]/30">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 active:scale-[0.98]"
        >
          <LogOut size={18} className="rotate-180" />
          <span>Cerrar sesión</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
