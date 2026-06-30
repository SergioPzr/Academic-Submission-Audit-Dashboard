import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import NavItem from './NavItem';
import { LogOut } from 'lucide-react';

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

const Sidebar: React.FC = () => {
  const { rol, signOut } = useAuth();

  const items = rol && NAV_ITEMS[rol] ? NAV_ITEMS[rol] : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>SRE-URP</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavItem
            key={item.path}
            label={item.label}
            path={item.path}
            icon={item.icon}
          />
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={signOut}
          className="btn btn-ghost w-full"
          style={{ color: 'rgba(255, 255, 255, 0.7)', justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.75rem' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
