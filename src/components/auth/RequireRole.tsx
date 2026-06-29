import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../lib/types';

interface Props {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: Props) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
