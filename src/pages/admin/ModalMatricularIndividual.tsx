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
      <div className="modal-box max-w-2xl overflow-hidden border-t-8 border-emerald-500 text-left" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <GraduationCap size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Matricular Estudiante</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Inscribir a <strong className="text-slate-700">{alumno.nombre_completo}</strong> ({alumno.codigo_institucional ?? 'Sin código'})
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner size="md" />
              <span className="text-xs text-slate-400 font-bold">Cargando cursos disponibles...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">
                Selecciona los cursos del ciclo activo para matricular al estudiante:
              </p>
              {cursos.length === 0 ? (
                <div className="text-center py-10 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
                  No hay cursos activos registrados en el sistema.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cursos.map((c) => {
                    const estaMatriculado = matriculasIds.includes(c.id_curso);
                    return (
                      <div
                        key={c.id_curso}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                          estaMatriculado 
                            ? 'bg-emerald-50/30 border-emerald-100/80' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {c.nombre}
                            </span>
                            <Badge label={c.seccion} variant={estaMatriculado ? 'success' : 'neutral'} />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                            <span>Código: <strong className="text-slate-600 font-mono">{c.codigo}</strong></span>
                            <span>•</span>
                            <span>Docente: <strong className="text-slate-600">{c.usuarios?.nombre_completo ?? 'Sin asignar'}</strong></span>
                          </div>
                        </div>

                        <div>
                          {estaMatriculado ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-md">
                                Inscrito
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading !== null}
                                loading={actionLoading === c.id_curso}
                                onClick={() => handleDesmatricular(c.id_curso)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
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
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalMatricularIndividual;
