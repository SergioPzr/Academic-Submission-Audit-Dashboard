import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 border border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-transparent',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-1" />}
      {!loading && icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
