import React from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isUpward: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  className = '',
}) => {
  return (
    <Card className={`p-5 flex items-start justify-between gap-4 ${className}`}>
      <div className="flex flex-col gap-1 text-left">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-2xl font-extrabold text-slate-800 tabular-nums">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              trend.isUpward ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend.isUpward ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
