import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../contexts/AuthContext';

const titles: Record<string, string> = {
  '/docente': 'Panel del Docente',
  '/docente/ventanas': 'Gestión de Ventanas',
  '/docente/reportes': 'Reportes Académicos',
  '/admin': 'Panel del Administrador',
  '/admin/usuarios': 'Gestión de Usuarios',
  '/admin/cursos': 'Gestión de Cursos',
  '/admin/matricula': 'Matrícula Masiva',
  '/admin/auditoria': 'Auditoría del Sistema',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasRole } = useAuth();
  const path = window.location.pathname;

  const title = titles[path] ?? 'EduTrack';
  const isAdmin = hasRole('administrador');

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 ml-0 lg:ml-60 flex flex-col">
        <Topbar
          title={title}
          breadcrumb={isAdmin ? '→ Panel de Control' : '→ Seguimiento y Auditoría'}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
