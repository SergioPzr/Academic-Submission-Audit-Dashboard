import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const style = {
    width: size === 'sm' ? '1rem' : size === 'lg' ? '3rem' : '2rem',
    height: size === 'sm' ? '1rem' : size === 'lg' ? '3rem' : '2rem',
  };

  return (
    <div
      className={`spinner ${className}`}
      style={style}
      role="status"
    >
      <span style={{ display: 'none' }}>Loading...</span>
    </div>
  );
};

export default Spinner;
