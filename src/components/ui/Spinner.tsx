import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
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
