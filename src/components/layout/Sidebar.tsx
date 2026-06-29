import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

const navItems: Record<string, { label: string; icon: string; path: string }[]> = {
  profesor: [
    { label: 'Seguimiento', icon: '🎛️', path: '/docente' },
    { label: 'Ventanas', icon: '📋', path: '/docente/ventanas' },
    { label: 'Reportes', icon: '📊', path: '/docente/reportes' },
  ],
  administrador: [
    { label: 'Dashboard', icon: '📊', path: '/admin' },
    { label: 'Usuarios', icon: '👥', path: '/admin/usuarios' },
    { label: 'Cursos', icon: '📚', path: '/admin/cursos' },
    { label: 'Matrícula', icon: '📝', path: '/admin/matricula' },
    { label: 'Auditoría', icon: '🔍', path: '/admin/auditoria' },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return null;

  const roleKey = hasRole('administrador') ? 'administrador' : 'profesor';
  const items = navItems[roleKey] ?? [];

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const roleLabel = profile.role === 'profesor' ? 'Docente' : 'Administrador';
  const avatarBg = profile.role === 'profesor' ? '#0891b2' : '#9333ea';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-60 bg-navy flex flex-col z-50 transition-transform duration-200 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo rounded-md flex items-center justify-center text-sm">
              📚
            </div>
            <div>
              <div className="text-white text-sm font-semibold">EduTrack</div>
              <div className="text-white/35 text-[10px] uppercase tracking-widest">Entregables</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-colors',
                location.pathname === item.path
                  ? 'bg-indigo text-white font-medium'
                  : 'text-white/55 hover:bg-white/10 hover:text-white/85'
              )}
            >
              <span className="text-base opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: avatarBg }}
            >
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile.full_name}</div>
              <div className="text-white/35 text-[10px]">{roleLabel}</div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-white/35 hover:text-white/70 text-xs shrink-0"
              title="Cerrar sesión"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
