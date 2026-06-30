import React from 'react';
import Badge from '../../components/ui/Badge';

interface OperacionBadgeProps {
  tipo: string;
}

const OperacionBadge: React.FC<OperacionBadgeProps> = ({ tipo }) => {
  // Verde (LOGIN_SUCCESS, CREATE_WINDOW)
  // Azul (UPDATE_USER, EXTENSION_GRANTED)
  // Amarillo (EXPORT_CSV, EXPORT_AUDIT_LOG)
  // Rojo (LOGIN_FAILED, DELETE_USER, DUPLICATE_HASH)
  // Morado (GRADE_SUBMISSION, UPLOAD_FILE)
  // Gris (CRON_REMINDER)
  
  if (tipo === 'LOGIN_SUCCESS' || tipo === 'CREATE_WINDOW') {
    return <Badge variant="success" label={tipo} />;
  }
  if (tipo === 'LOGIN_FAILED' || tipo === 'DELETE_USER' || tipo === 'DUPLICATE_HASH') {
    return <Badge variant="error" label={tipo} />;
  }
  if (tipo === 'EXPORT_CSV' || tipo === 'EXPORT_AUDIT_LOG') {
    return <Badge variant="warning" label={tipo} />;
  }
  if (tipo === 'CRON_REMINDER') {
    return <Badge variant="neutral" label={tipo} />;
  }
  if (tipo === 'UPDATE_USER' || tipo === 'EXTENSION_GRANTED') {
    return (
      <span 
        className="badge" 
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
      >
        {tipo}
      </span>
    );
  }
  if (tipo === 'GRADE_SUBMISSION' || tipo === 'UPLOAD_FILE') {
    return (
      <span 
        className="badge" 
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}
      >
        {tipo}
      </span>
    );
  }
  
  return <Badge variant="neutral" label={tipo} />;
};

export default OperacionBadge;
