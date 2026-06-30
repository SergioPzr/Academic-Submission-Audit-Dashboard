import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col w-full text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
          {label}
        </label>
      )}
      <div className="relative w-full flex items-center">
        {icon && <span className="absolute left-3.5 text-slate-400 pointer-events-none">{icon}</span>}
        <input
          id={inputId}
          className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 ${
            icon ? 'pl-11 pr-4' : 'px-4'
          } ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-600 font-medium mt-1">{error}</span>}
    </div>
  );
};

export default Input;
