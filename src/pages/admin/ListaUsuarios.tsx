import React, { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, RefreshCw, GraduationCap } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ModalMatricularIndividual from './ModalMatricularIndividual';
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
  const [selectedAlumno, setSelectedAlumno] = useState<UsuarioCompleto | null>(null);

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
    <Card className="p-6 space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            id="busqueda-usuario"
            type="text"
            placeholder="Buscar por nombre, código o correo…"
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        
        <select
          id="filtro-rol"
          className="w-full sm:w-[160px] bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="todos">Todos los roles</option>
          <option value="alumno">Alumno</option>
          <option value="profesor">Profesor</option>
          <option value="administrador">Administrador</option>
        </select>

        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={fetchUsuarios}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="md" />
          <p className="text-xs text-slate-400 font-bold">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-semibold">
            {filtered.length} usuario{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
          
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Correo</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Facultad</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 text-left">
                        {u.nombre_completo}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 font-mono">{u.codigo_institucional ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold text-left max-w-[200px] truncate">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          label={u.roles?.nombre ?? '—'}
                          variant={rolesBadge[u.roles?.nombre ?? ''] ?? 'neutral'}
                        />
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-left">{u.facultad ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          label={u.estado}
                          variant={u.estado === 'activo' ? 'success' : 'error'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {u.roles?.nombre === 'alumno' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<GraduationCap size={14} />}
                              onClick={() => setSelectedAlumno(u)}
                              disabled={u.estado !== 'activo'}
                              title={u.estado !== 'activo' ? 'El alumno debe estar activo para matricularlo' : 'Matricular estudiante'}
                            >
                              Matricular
                            </Button>
                          )}
                          <Button
                            variant={u.estado === 'activo' ? 'ghost' : 'secondary'}
                            size="sm"
                            loading={actionLoading === u.id}
                            icon={u.estado === 'activo' ? <UserX size={14} /> : <UserCheck size={14} />}
                            onClick={() => handleToggleEstado(u)}
                            className={u.estado === 'activo' ? 'text-red-600 hover:bg-red-50' : ''}
                          >
                            {u.estado === 'activo' ? 'Deshabilitar' : 'Habilitar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedAlumno && (
        <ModalMatricularIndividual
          alumno={selectedAlumno}
          onClose={() => setSelectedAlumno(null)}
        />
      )}
    </Card>
  );
};

export default ListaUsuarios;
