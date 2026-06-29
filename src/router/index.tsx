import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RequireRole from '../components/auth/RequireRole';
import AppLayout from '../components/layout/AppLayout';
import AuthPage from '../components/auth/AuthPage';
import DashboardDocente from '../components/docente/DashboardDocente';
import VentanaList from '../components/docente/VentanaList';
import DashboardAdmin from '../components/administrador/DashboardAdmin';
import UserCreateForm from '../components/administrador/UserCreateForm';
import UserDisable from '../components/administrador/UserDisable';
import CursoForm from '../components/administrador/CursoForm';
import MatriculaUpload from '../components/administrador/MatriculaUpload';
import AuditLogPanel from '../components/administrador/AuditLogPanel';
import { PanelAlumno } from '../pages/PanelAlumno';
import { ServerTimeProvider } from '../providers/ServerTimeProvider';
import { ToastProvider } from '../components/ui/Toast';

function DefaultRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'alumno') return <Navigate to="/alumno" replace />;
  if (profile.role === 'administrador') return <Navigate to="/admin" replace />;
  return <Navigate to="/docente" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultRedirect />} />

            {/* Rutas DOCENTE */}
            <Route
              path="docente"
              element={
                <RequireRole roles={['profesor', 'administrador']}>
                  <DashboardDocente />
                </RequireRole>
              }
            />
            <Route
              path="docente/ventanas"
              element={
                <RequireRole roles={['profesor', 'administrador']}>
                  <VentanaList cursoId="curso-1" />
                </RequireRole>
              }
            />

            {/* Rutas ADMIN */}
            <Route
              path="admin"
              element={
                <RequireRole roles={['administrador']}>
                  <DashboardAdmin />
                </RequireRole>
              }
            />
            <Route
              path="admin/usuarios"
              element={
                <RequireRole roles={['administrador']}>
                  <div className="space-y-6">
                    <UserCreateForm />
                    <UserDisable />
                  </div>
                </RequireRole>
              }
            />
            <Route
              path="admin/cursos"
              element={
                <RequireRole roles={['administrador']}>
                  <CursoForm />
                </RequireRole>
              }
            />
            <Route
              path="admin/matricula"
              element={
                <RequireRole roles={['administrador']}>
                  <MatriculaUpload />
                </RequireRole>
              }
            />
            <Route
              path="admin/auditoria"
              element={
                <RequireRole roles={['administrador']}>
                  <AuditLogPanel />
                </RequireRole>
              }
            />
          </Route>

          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center bg-surface">
              <div className="text-center">
                <div className="text-5xl mb-4">🚫</div>
                <h1 className="text-xl font-bold text-text-1 mb-2">Acceso Denegado</h1>
                <p className="text-text-3">No tienes permisos para acceder a esta página.</p>
              </div>
            </div>
          } />

          <Route
            path="/alumno"
            element={
              <ProtectedRoute>
                <RequireRole roles={['alumno']}>
                  <ServerTimeProvider>
                    <ToastProvider>
                      <PanelAlumno />
                    </ToastProvider>
                  </ServerTimeProvider>
                </RequireRole>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
