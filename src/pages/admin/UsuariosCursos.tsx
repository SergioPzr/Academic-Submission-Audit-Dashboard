import React, { useEffect, useState, useCallback } from 'react';
import { Users, BookOpen, Plus, Search, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import ListaUsuarios from './ListaUsuarios';
import FormCrearUsuario from './FormCrearUsuario';
import FormCrearCurso from './FormCrearCurso';
import MatriculaMasiva from './MatriculaMasiva';
import {
  getCursos,
  editarEstadoCurso,
  type CursoCompleto,
} from '../../services/adminService';

type Tab = 'usuarios' | 'cursos' | 'matricula';

const UsuariosCursos: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [showFormUsuario, setShowFormUsuario] = useState(false);
  const [showFormCurso, setShowFormCurso] = useState(false);
  const [cursos, setCursos] = useState<CursoCompleto[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [cursoBusqueda, setCursoBusqueda] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCursos = useCallback(async () => {
    setLoadingCursos(true);
    try {
      const data = await getCursos();
      setCursos(data);
    } catch (err) {
      console.error('Error cargando cursos:', err);
    } finally {
      setLoadingCursos(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'cursos') fetchCursos();
  }, [activeTab, fetchCursos, refreshKey]);

  const handleToggleCurso = async (curso: CursoCompleto) => {
    const nuevoEstado = curso.estado === 'activo' ? 'inactivo' : 'activo';
    setActionLoading(curso.id_curso);
    try {
      await editarEstadoCurso(curso.id_curso, nuevoEstado);
      setCursos((prev) =>
        prev.map((c) => (c.id_curso === curso.id_curso ? { ...c, estado: nuevoEstado } : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const cursosFiltrados = cursos.filter(
    (c) =>
      cursoBusqueda.trim() === '' ||
      c.nombre.toLowerCase().includes(cursoBusqueda.toLowerCase()) ||
      c.codigo.toLowerCase().includes(cursoBusqueda.toLowerCase()) ||
      c.seccion.toLowerCase().includes(cursoBusqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Usuarios &amp; Cursos</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Gestión de cuentas, cursos y matrículas masivas</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'usuarios' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowFormUsuario(true)}
            >
              Crear usuario
            </Button>
          )}
          {activeTab === 'cursos' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowFormCurso(true)}
            >
              Crear curso
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 pb-px">
        <button
          id="tab-usuarios"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'usuarios'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={14} />
          Usuarios
        </button>
        <button
          id="tab-cursos"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'cursos'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          onClick={() => setActiveTab('cursos')}
        >
          <BookOpen size={14} />
          Cursos
        </button>
        <button
          id="tab-matricula"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 ${
            activeTab === 'matricula'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          onClick={() => setActiveTab('matricula')}
        >
          <Plus size={14} />
          Matrícula Masiva (CSV)
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {/* Tab: Usuarios */}
        {activeTab === 'usuarios' && (
          <ListaUsuarios key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />
        )}

        {/* Tab: Cursos */}
        {activeTab === 'cursos' && (
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  id="busqueda-curso"
                  type="text"
                  placeholder="Buscar por nombre, código o sección…"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
                  value={cursoBusqueda}
                  onChange={(e) => setCursoBusqueda(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={fetchCursos}
                disabled={loadingCursos}
              >
                <RefreshCw size={14} className={loadingCursos ? 'animate-spin' : ''} />
              </Button>
            </div>

            {loadingCursos ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Spinner size="md" />
                <p className="text-xs text-slate-400 font-bold">Cargando cursos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-semibold">
                  {cursosFiltrados.length} curso{cursosFiltrados.length !== 1 ? 's' : ''} encontrado{cursosFiltrados.length !== 1 ? 's' : ''}
                </p>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Código</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Sección</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Ciclo</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Docente</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {cursosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                            No se encontraron cursos
                          </td>
                        </tr>
                      ) : (
                        cursosFiltrados.map((c) => (
                          <tr key={c.id_curso} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700 font-mono">{c.codigo}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800 text-left">{c.nombre}</td>
                            <td className="px-6 py-4 font-bold text-slate-700 font-mono">{c.seccion}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium">{c.ciclo_academico}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium text-left">
                              {c.usuarios?.nombre_completo ?? <span className="text-slate-400 italic">Sin asignar</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                label={c.estado}
                                variant={c.estado === 'activo' ? 'success' : 'error'}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 transition"
                                disabled={actionLoading === c.id_curso}
                                onClick={() => handleToggleCurso(c)}
                                title={c.estado === 'activo' ? 'Desactivar curso' : 'Activar curso'}
                              >
                                {actionLoading === c.id_curso ? (
                                  <Spinner size="sm" />
                                ) : c.estado === 'activo' ? (
                                  <ToggleRight size={22} className="text-emerald-600" />
                                ) : (
                                  <ToggleLeft size={22} className="text-slate-400" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tab: Matrícula Masiva */}
        {activeTab === 'matricula' && <MatriculaMasiva />}
      </div>

      {/* Modals */}
      {showFormUsuario && (
        <FormCrearUsuario
          onClose={() => setShowFormUsuario(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {showFormCurso && (
        <FormCrearCurso
          onClose={() => setShowFormCurso(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default UsuariosCursos;
