import React from 'react';
import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface NavItemProps {
  label: string;
  path: string;
  icon: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, path, icon }) => {
  // Resolve icon component dynamically from lucide-react
  const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;

  return (
    <NavLink
      to={path}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
      // Avoid false active matches for root paths by setting end for exact matches
      end={path === '/alumno' || path === '/profesor' || path === '/admin'}
    >
      <IconComponent size={20} />
      <span>{label}</span>
    </NavLink>
  );
};

export default NavItem;
