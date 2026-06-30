import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'neutral';
  label: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', label, className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
