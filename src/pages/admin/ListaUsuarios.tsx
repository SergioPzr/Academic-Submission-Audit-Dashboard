import React, { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, RefreshCw } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import {
  getUsuarios,
  editarEstadoUsuario,
  type UsuarioCompleto,
} from '../../services/adminService';

interface ListaUsuariosProps {
  onRefresh?: () => void;
}

const ListaUsuarios: React.FC<ListaUsuariosProps> = ({ onRefresh }) => {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleToggleEstado = async (usuario: UsuarioCompleto) => {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    setActionLoading(usuario.id);
    try {
      await editarEstadoUsuario(usuario.id, nuevoEstado);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, estado: nuevoEstado } : u))
      );
      onRefresh?.();
    } catch (err: any) {
      setError(err.message ?? 'Error al cambiar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = usuarios.filter((u) => {
    const matchBusqueda =
      busqueda.trim() === '' ||
      u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.codigo_institucional ?? '').toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = filtroRol === 'todos' || u.roles?.nombre === filtroRol;
    return matchBusqueda && matchRol;
  });

  const rolesBadge: Record<string, 'success' | 'warning' | 'neutral'> = {
    alumno: 'neutral',
    profesor: 'warning',
    administrador: 'success',
  };

  return (
    <div className="lista-usuarios">
      <div className="lista-usuarios-toolbar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            id="busqueda-usuario"
            type="text"
            placeholder="Buscar por nombre, código o correo…"
            className="search-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          id="filtro-rol"
          className="rol-select"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="todos">Todos los roles</option>
          <option value="alumno">Alumno</option>
          <option value="profesor">Profesor</option>
          <option value="administrador">Administrador</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={fetchUsuarios} disabled={loading} title="Refrescar">
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
        </button>
      </div>

      {error && (
        <div className="admin-error-banner" style={{ marginBottom: '1rem' }}>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-center">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <p className="text-subtitle" style={{ marginBottom: '0.75rem' }}>
            {filtered.length} usuario{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>CÓDIGO</th>
                  <th>CORREO</th>
                  <th>ROL</th>
                  <th>FACULTAD</th>
                  <th>ESTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="usuario-nombre">{u.nombre_completo}</div>
                      </td>
                      <td className="admin-td-mono">{u.codigo_institucional ?? '—'}</td>
                      <td className="admin-td-email">{u.email}</td>
                      <td>
                        <Badge
                          label={u.roles?.nombre ?? '—'}
                          variant={rolesBadge[u.roles?.nombre ?? ''] ?? 'neutral'}
                        />
                      </td>
                      <td>{u.facultad ?? '—'}</td>
                      <td>
                        <Badge
                          label={u.estado}
                          variant={u.estado === 'activo' ? 'success' : 'error'}
                        />
                      </td>
                      <td>
                        <Button
                          variant={u.estado === 'activo' ? 'ghost' : 'secondary'}
                          size="sm"
                          loading={actionLoading === u.id}
                          icon={u.estado === 'activo' ? <UserX size={14} /> : <UserCheck size={14} />}
                          onClick={() => handleToggleEstado(u)}
                          className={u.estado === 'activo' ? 'btn-danger-ghost' : ''}
                        >
                          {u.estado === 'activo' ? 'Deshabilitar' : 'Habilitar'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ListaUsuarios;
