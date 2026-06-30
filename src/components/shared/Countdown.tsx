import React, { useEffect, useState, useRef } from 'react';
import { getServerTime } from '../../services/entregasService';

interface CountdownProps {
  fechaCierre: string; // ISO string
  onExpire?: () => void;
  className?: string;
}

const Countdown: React.FC<CountdownProps> = ({ fechaCierre, onExpire, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--:--');
  const [urgency, setUrgency] = useState<'normal' | 'warning' | 'error' | 'expired'>('normal');
  
  // Keep track of the time offset: (Server Time - Client Local Time) in ms
  const [offset, setOffset] = useState<number>(0);
  const onExpireRef = useRef(onExpire);

  // Update ref to avoid stale closure in interval
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // 1. Sync offset with server time on mount and periodically
  useEffect(() => {
    let active = true;

    const syncTime = async () => {
      try {
        const startClient = Date.now();
        const serverDate = await getServerTime();
        const endClient = Date.now();
        
        // Estimate network delay (half of roundtrip)
        const delay = (endClient - startClient) / 2;
        const adjustedServerTime = serverDate.getTime() + delay;
        
        if (active) {
          setOffset(adjustedServerTime - endClient);
        }
      } catch (err) {
        console.error('Error synchronizing time with server:', err);
      }
    };

    syncTime();
    
    // Sync every 60 seconds to avoid clock drift
    const syncInterval = setInterval(syncTime, 60000);

    return () => {
      active = false;
      clearInterval(syncInterval);
    };
  }, []);

  // 2. Local countdown ticker
  useEffect(() => {
    const targetTime = new Date(fechaCierre).getTime();

    const updateTimer = () => {
      const currentServerTime = Date.now() + offset;
      const difference = targetTime - currentServerTime;

      if (difference <= 0) {
        setTimeLeft('00:00:00:00');
        setUrgency('expired');
        if (onExpireRef.current) {
          onExpireRef.current();
        }
        return false;
      }

      // Calculate time units
      const sec = 1000;
      const min = sec * 60;
      const hr = min * 60;
      const day = hr * 24;

      const days = Math.floor(difference / day);
      const hours = Math.floor((difference % day) / hr);
      const minutes = Math.floor((difference % hr) / min);
      const seconds = Math.floor((difference % min) / sec);

      // Pad with leading zeros
      const dStr = String(days).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeLeft(`${dStr}:${hStr}:${mStr}:${sStr}`);

      // Set urgency states based on difference
      // Less than 1 hour (3600000 ms) -> error
      // Less than 24 hours (86400000 ms) -> warning
      // More than 24 hours -> normal
      if (difference < 3600000) {
        setUrgency('error');
      } else if (difference < 86400000) {
        setUrgency('warning');
      } else {
        setUrgency('normal');
      }

      return true;
    };

    // Initial update
    const active = updateTimer();
    if (!active) return;

    const timer = setInterval(() => {
      const isTimerActive = updateTimer();
      if (!isTimerActive) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fechaCierre, offset]);

  const getUrgencyStyles = () => {
    switch (urgency) {
      case 'expired':
        return {
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          backgroundColor: '#F3F4F6',
          border: '1px solid #E5E7EB'
        };
      case 'error':
        return {
          color: 'var(--color-error)',
          fontWeight: 700,
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5'
        };
      case 'warning':
        return {
          color: 'var(--color-warning)',
          fontWeight: 600,
          backgroundColor: '#FEF3C7',
          border: '1px solid #FDE68A'
        };
      case 'normal':
      default:
        return {
          color: 'var(--color-success)',
          fontWeight: 600,
          backgroundColor: '#DCFCE7',
          border: '1px solid #86EFAC'
        };
    }
  };

  return (
    <div 
      className={`countdown-badge flex items-center justify-center font-mono ${className}`}
      style={{
        display: 'inline-flex',
        padding: '0.25rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.875rem',
        letterSpacing: '0.05em',
        transition: 'all 0.3s ease',
        ...getUrgencyStyles()
      }}
    >
      {urgency === 'expired' ? 'EXPIRADO' : timeLeft}
    </div>
  );
};

export default Countdown;
