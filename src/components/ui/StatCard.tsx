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
    <Card className={`stat-card ${className}`}>
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
        {trend && (
          <span
            className={`stat-card-trend ${
              trend.isUpward ? 'stat-card-trend-up' : 'stat-card-trend-down'
            }`}
          >
            {trend.isUpward ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {icon && <div className="stat-card-icon">{icon}</div>}
    </Card>
  );
};

export default StatCard;
// 
