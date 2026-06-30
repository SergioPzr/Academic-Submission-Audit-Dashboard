import React, { useEffect, useState, useCallback } from 'react';
import { Users, BookOpen, Plus, Search, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
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
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-panel-header">
        <div>
          <h2 className="text-h2">Usuarios &amp; Cursos</h2>
          <p className="text-subtitle">Gestión de cuentas, cursos y matrículas masivas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
      <div className="tab-nav">
        <button
          id="tab-usuarios"
          className={`tab-btn${activeTab === 'usuarios' ? ' tab-btn-active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={15} />
          Usuarios
        </button>
        <button
          id="tab-cursos"
          className={`tab-btn${activeTab === 'cursos' ? ' tab-btn-active' : ''}`}
          onClick={() => setActiveTab('cursos')}
        >
          <BookOpen size={15} />
          Cursos
        </button>
        <button
          id="tab-matricula"
          className={`tab-btn${activeTab === 'matricula' ? ' tab-btn-active' : ''}`}
          onClick={() => setActiveTab('matricula')}
        >
          <Plus size={15} />
          Matrícula Masiva (CSV)
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Tab: Usuarios */}
        {activeTab === 'usuarios' && (
          <ListaUsuarios key={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />
        )}

        {/* Tab: Cursos */}
        {activeTab === 'cursos' && (
          <div className="lista-usuarios">
            <div className="lista-usuarios-toolbar">
              <div className="search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  id="busqueda-curso"
                  type="text"
                  placeholder="Buscar por nombre, código o sección…"
                  className="search-input"
                  value={cursoBusqueda}
                  onChange={(e) => setCursoBusqueda(e.target.value)}
                />
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={fetchCursos}
                disabled={loadingCursos}
                title="Refrescar"
              >
                <RefreshCw size={14} className={loadingCursos ? 'spin-icon' : ''} />
              </button>
            </div>

            {loadingCursos ? (
              <div className="admin-loading-center">
                <Spinner size="md" />
              </div>
            ) : (
              <>
                <p className="text-subtitle" style={{ marginBottom: '0.75rem' }}>
                  {cursosFiltrados.length} curso{cursosFiltrados.length !== 1 ? 's' : ''} encontrado{cursosFiltrados.length !== 1 ? 's' : ''}
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>CÓDIGO</th>
                        <th>NOMBRE</th>
                        <th>SECCIÓN</th>
                        <th>CICLO</th>
                        <th>DOCENTE</th>
                        <th>ESTADO</th>
                        <th>ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                            No se encontraron cursos
                          </td>
                        </tr>
                      ) : (
                        cursosFiltrados.map((c) => (
                          <tr key={c.id_curso}>
                            <td className="admin-td-mono">{c.codigo}</td>
                            <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                            <td className="admin-td-mono">{c.seccion}</td>
                            <td>{c.ciclo_academico}</td>
                            <td>{c.usuarios?.nombre_completo ?? <span className="text-subtitle">Sin asignar</span>}</td>
                            <td>
                              <Badge
                                label={c.estado}
                                variant={c.estado === 'activo' ? 'success' : 'error'}
                              />
                            </td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={actionLoading === c.id_curso}
                                onClick={() => handleToggleCurso(c)}
                                title={c.estado === 'activo' ? 'Desactivar curso' : 'Activar curso'}
                              >
                                {actionLoading === c.id_curso ? (
                                  <Spinner size="sm" />
                                ) : c.estado === 'activo' ? (
                                  <ToggleRight size={18} color="var(--color-success)" />
                                ) : (
                                  <ToggleLeft size={18} color="var(--color-text-secondary)" />
                                )}
                              </button>
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
