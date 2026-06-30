import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Shell from '../components/layout/Shell';

// Auth Pages
import Login from '../pages/auth/Login';

// Student Pages
import PanelAlumno from '../pages/alumno/PanelAlumno';
import HistorialAlumno from '../pages/alumno/HistorialAlumno';
import CronogramaAlumno from '../pages/alumno/CronogramaAlumno';

// Professor Pages
import MisCursosProfesor from '../pages/profesor/MisCursosProfesor';
import MonitorVivo from '../pages/profesor/MonitorVivo';
import CalificacionProfesor from '../pages/profesor/CalificacionProfesor';
import CronogramaProfesor from '../pages/profesor/CronogramaProfesor';

// Admin Pages
import PanelAdmin from '../pages/admin/PanelAdmin';
import UsuariosCursos from '../pages/admin/UsuariosCursos';
import LogAuditoria from '../pages/admin/LogAuditoria';

// Route Guards
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: ('alumno' | 'profesor' | 'administrador')[];
}> = ({ children, allowedRoles }) => {
  const { session, rol, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && rol && !allowedRoles.includes(rol)) {
    // Redirect user to their own home path
    const homePaths = {
      alumno: '/alumno',
      profesor: '/profesor',
      administrador: '/admin',
    };
    return <Navigate to={homePaths[rol] || '/login'} replace />;
  }

  return children;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, rol, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (session && rol) {
    const homePaths = {
      alumno: '/alumno',
      profesor: '/profesor',
      administrador: '/admin',
    };
    return <Navigate to={homePaths[rol] || '/login'} replace />;
  }

  return children;
};

// Root Redirect component
const RootRedirect: React.FC = () => {
  const { session, rol, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const homePaths = {
    alumno: '/alumno',
    profesor: '/profesor',
    administrador: '/admin',
  };

  return <Navigate to={rol ? homePaths[rol] : '/login'} replace />;
};



const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Root path */}
        <Route path="/" element={<RootRedirect />} />

        {/* Protected routes under layout Shell */}
        <Route
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          {/* Student Area */}
          <Route
            path="/alumno"
            element={
              <ProtectedRoute allowedRoles={['alumno']}>
                <PanelAlumno />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alumno/historial"
            element={
              <ProtectedRoute allowedRoles={['alumno']}>
                <HistorialAlumno />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alumno/cronograma"
            element={
              <ProtectedRoute allowedRoles={['alumno']}>
                <CronogramaAlumno />
              </ProtectedRoute>
            }
          />

          {/* Professor Area */}
          <Route
            path="/profesor"
            element={
              <ProtectedRoute allowedRoles={['profesor']}>
                <MisCursosProfesor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profesor/monitor"
            element={
              <ProtectedRoute allowedRoles={['profesor']}>
                <MonitorVivo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profesor/calificacion"
            element={
              <ProtectedRoute allowedRoles={['profesor']}>
                <CalificacionProfesor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profesor/cronograma"
            element={
              <ProtectedRoute allowedRoles={['profesor']}>
                <CronogramaProfesor />
              </ProtectedRoute>
            }
          />

          {/* Admin Area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <PanelAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <UsuariosCursos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/auditoria"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <LogAuditoria />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
