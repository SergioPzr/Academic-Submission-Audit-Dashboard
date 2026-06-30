import React from 'react';
import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface NavItemProps {
  label: string;
  path: string;
  icon: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, path, icon }) => {
  const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;

  return (
    <NavLink
      to={path}
      className={({ isActive }: { isActive: boolean }) => 
        `flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 ${
          isActive 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/30'
        }`
      }
      end={path === '/alumno' || path === '/profesor' || path === '/admin'}
    >
      <IconComponent size={18} />
      <span>{label}</span>
    </NavLink>
  );
};

export default NavItem;
