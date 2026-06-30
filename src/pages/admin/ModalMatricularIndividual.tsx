import React, { useEffect, useState, useCallback } from 'react';
import { X, BookOpen, GraduationCap, PlusCircle, CheckCircle, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import {
  getCursos,
  getMatriculasAlumno,
  matricularAlumno,
  desmatricularAlumno,
  type CursoCompleto,
  type UsuarioCompleto
} from '../../services/adminService';

interface ModalMatricularIndividualProps {
  onClose: () => void;
  alumno: UsuarioCompleto;
}

const ModalMatricularIndividual: React.FC<ModalMatricularIndividualProps> = ({ onClose, alumno }) => {
  const [cursos, setCursos] = useState<CursoCompleto[]>([]);
  const [matriculasIds, setMatriculasIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todosCursos, userMatriculas] = await Promise.all([
        getCursos(),
        getMatriculasAlumno(alumno.id)
      ]);
      setCursos(todosCursos.filter(c => c.estado === 'activo'));
      setMatriculasIds(userMatriculas.map(m => m.id_curso));
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar cursos o matrículas del alumno.');
    } finally {
      setLoading(false);
    }
  }, [alumno.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMatricular = async (idCurso: string) => {
    setActionLoading(idCurso);
    setError(null);
    try {
      await matricularAlumno(alumno.id, idCurso);
      setMatriculasIds(prev => [...prev, idCurso]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al inscribir al alumno en el curso.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDesmatricular = async (idCurso: string) => {
    if (!window.confirm('¿Está seguro de que desea retirar al estudiante de este curso?')) {
      return;
    }
    setActionLoading(idCurso);
    setError(null);
    try {
      await desmatricularAlumno(alumno.id, idCurso);
      setMatriculasIds(prev => prev.filter(id => id !== idCurso));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al retirar al alumno del curso.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="modal-icon-badge">
              <GraduationCap size={18} color="var(--color-accent)" />
            </div>
            <div>
              <h3 className="text-h3">Matricular Estudiante</h3>
              <p className="text-subtitle">
                Inscribir a <strong>{alumno.nombre_completo}</strong> ({alumno.codigo_institucional ?? 'Sin código'})
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
          {error && (
            <div className="admin-error-banner" style={{ marginBottom: '1rem' }}>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="admin-loading-center" style={{ padding: '2rem 0' }}>
              <Spinner size="md" />
              <span className="text-subtitle" style={{ marginLeft: '0.5rem' }}>Cargando cursos disponibles...</span>
            </div>
          ) : (
            <div className="cursos-matricula-lista" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p className="text-subtitle" style={{ marginBottom: '0.5rem' }}>
                Selecciona los cursos del ciclo activo para matricular al estudiante:
              </p>
              {cursos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                  No hay cursos activos registrados en el sistema.
                </div>
              ) : (
                cursos.map((c) => {
                  const estaMatriculado = matriculasIds.includes(c.id_curso);
                  return (
                    <div
                      key={c.id_curso}
                      className="curso-matricula-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: estaMatriculado ? 'rgba(var(--color-success-rgb), 0.03)' : 'var(--color-bg-card)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                            {c.nombre}
                          </span>
                          <Badge label={c.seccion} variant="neutral" />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          <span>Código: <strong className="font-mono">{c.codigo}</strong></span>
                          <span>Docente: {c.usuarios?.nombre_completo ?? 'Sin asignar'}</span>
                        </div>
                      </div>

                      <div>
                        {estaMatriculado ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge label="Inscrito" variant="success" />
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading !== null}
                              loading={actionLoading === c.id_curso}
                              onClick={() => handleDesmatricular(c.id_curso)}
                              className="btn-danger-ghost"
                              style={{ padding: '0.25rem 0.5rem' }}
                              title="Retirar del curso"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading !== null}
                            loading={actionLoading === c.id_curso}
                            onClick={() => handleMatricular(c.id_curso)}
                            icon={<PlusCircle size={14} />}
                          >
                            Matricular
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalMatricularIndividual;
