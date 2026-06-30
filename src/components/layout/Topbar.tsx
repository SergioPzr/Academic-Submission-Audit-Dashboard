import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Topbar: React.FC = () => {
  const { perfil, rol } = useAuth();

  // Helper to get user initials
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
        return 'SRE-URP · Portal del Estudiante';
      case 'profesor':
        return 'SRE-URP · Portal del Docente';
      case 'administrador':
        return 'SRE-URP · Portal de Administración';
      default:
        return 'SRE-URP';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-title">{getPortalTitle()}</div>
      <div className="topbar-right">
        {perfil && (
          <div className="topbar-user">
            <div className="topbar-avatar">
              {getInitials(perfil.nombre_completo)}
            </div>
            <div className="topbar-user-info">
              <span className="topbar-username">{perfil.nombre_completo}</span>
              <span className="topbar-role">{rol}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
