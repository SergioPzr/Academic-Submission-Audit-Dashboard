import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'neutral';
  label: string;
  className?: string;
}

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', label, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${variantClasses[variant]} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
