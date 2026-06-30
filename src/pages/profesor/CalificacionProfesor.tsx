import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getMisCursos } from '../../services/cursosService';
import type { CursoConStats } from '../../services/cursosService';
import { getEntregablesPorCurso } from '../../services/entregablesService';
import type { Entregable } from '../../services/entregablesService';
import { getEntregasPorEntregable, evaluarEntrega, modificarEvaluacion } from '../../services/calificacionService';
import type { AlumnoCalificacion } from '../../services/calificacionService';
import { formatInLimaTimezone, formatBytes } from '../../utils/dateUtils';
import { ArrowLeft, Search, FileText, Check, Edit3, Clipboard, HelpCircle, GraduationCap } from 'lucide-react';

interface ModalEvaluarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: AlumnoCalificacion;
}

const ModalEvaluar: React.FC<ModalEvaluarProps> = ({ isOpen, onClose, onSuccess, student }) => {
  const { user } = useAuth();
  const [nota, setNota] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!student.entrega?.revision;

  useEffect(() => {
    if (isOpen) {
      if (student.entrega?.revision) {
        setNota(student.entrega.revision.nota?.toString() || '');
        setFeedback(student.entrega.revision.retroalimentacion || '');
      } else {
        setNota('');
        setFeedback('');
      }
      setError(null);
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.entrega) return;
    if (!user?.id) return;

    const notaNum = parseFloat(nota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
      setError('La nota debe ser un número entre 0 y 20');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && student.entrega.revision) {
        await modificarEvaluacion(student.entrega.revision.id_revision, notaNum, feedback);
      } else {
        await evaluarEntrega(student.entrega.id_entrega, notaNum, feedback, user.id);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al guardar la calificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="card max-w-md w-full p-6 animate-fade-in bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-primary-dark">
            {isEditing ? 'Modificar Calificación' : 'Evaluar Entrega'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-700 space-y-1">
          <p><strong>Alumno:</strong> {student.nombre_completo}</p>
          <p><strong>Código:</strong> {student.codigo_institucional || '---'}</p>
          {student.entrega && (
            <>
              <p><strong>Archivo:</strong> {student.entrega.nombre_archivo} ({formatBytes(student.entrega.tamano_bytes)})</p>
              <p><strong>Fecha envío:</strong> {formatInLimaTimezone(student.entrega.timestamp_servidor, 'full')}</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {student.entrega?.drive_url && (
            <div className="pt-1 pb-3">
              <a
                href={student.entrega.drive_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center p-2.5 border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg text-emerald-800 text-sm font-bold text-center transition-colors"
              >
                <FileText size={18} className="mr-2 text-emerald-600" />
                Abrir Archivo en Google Drive
              </a>
            </div>
          )}

          <Input
            type="number"
            step="0.5"
            min="0"
            max="20"
            label="Nota (0.00 a 20.00)"
            placeholder="Ej. 17.5"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            required
            disabled={loading}
          />

          <div className="input-group">
            <label className="input-label">Retroalimentación / Comentarios</label>
            <textarea
              className="input-field min-h-[100px] py-2"
              placeholder="Escriba aquí los comentarios de la evaluación..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={loading}
              maxLength={500}
            />
            <div className="text-right text-[10px] text-gray-400 mt-1">
              {feedback.length}/500 caracteres
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Guardar Nota
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CalificacionProfesor: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  // Selected Course and Deliverable
  const [cursoId, setCursoId] = useState<string>(sessionStorage.getItem('calificacion_curso_id') || '');
  const [entregableId, setEntregableId] = useState<string>(sessionStorage.getItem('calificacion_entregable_id') || '');

  // Selectable options
  const [cursos, setCursos] = useState<CursoConStats[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  // Students list
  const [students, setStudents] = useState<AlumnoCalificacion[]>([]);
  const [search, setSearch] = useState('');
  
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [evalSelectedStudent, setEvalSelectedStudent] = useState<AlumnoCalificacion | null>(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);

  // 1. Fetch courses
  useEffect(() => {
    const fetchCursos = async () => {
      if (!perfil?.id) return;
      try {
        const list = await getMisCursos(perfil.id);
        setCursos(list);
        if (list.length > 0) {
          if (!cursoId) {
            setCursoId(list[0].id_curso);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCursos(false);
      }
    };
    fetchCursos();
  }, [perfil?.id, cursoId]);

  // 2. Fetch deliverables when courseId changes
  useEffect(() => {
    const fetchEntregables = async () => {
      if (!cursoId) return;
      try {
        const list = await getEntregablesPorCurso(cursoId);
        setEntregables(list);
        if (list.length > 0) {
          const exists = list.some(e => e.id_entregable === entregableId);
          if (!exists) {
            setEntregableId(list[0].id_entregable);
          }
        } else {
          setEntregableId('');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEntregables();
  }, [cursoId, entregableId]);

  // 3. Load students & grades
  const loadGradesData = useCallback(async () => {
    if (!cursoId || !entregableId) {
      setStudents([]);
      return;
    }

    setLoadingGrid(true);
    setError(null);
    try {
      const data = await getEntregasPorEntregable(cursoId, entregableId);
      setStudents(data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de entregas y alumnos');
    } finally {
      setLoadingGrid(false);
    }
  }, [cursoId, entregableId]);

  useEffect(() => {
    loadGradesData();
  }, [loadGradesData]);

  // Filter students locally
  const filteredStudents = students.filter(
    (s) =>
      s.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      (s.codigo_institucional && s.codigo_institucional.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenEvalModal = (student: AlumnoCalificacion) => {
    setEvalSelectedStudent(student);
    setEvalModalOpen(true);
  };

  const handleEvalSuccess = () => {
    loadGradesData();
  };

  // Stats
  const totalAlumnos = students.length;
  const entregadosCount = students.filter(s => s.estado_calificacion === 'Entregado' || s.estado_calificacion === 'Tardío').length;
  const calificadosCount = students.filter(s => s.estado_calificacion === 'Calificado').length;
  const pendientesCount = students.filter(s => s.estado_calificacion === 'No Entregado').length;

  const currentCourse = cursos.find(c => c.id_curso === cursoId);
  const currentEntregable = entregables.find(e => e.id_entregable === entregableId);

  return (
    <div className="space-y-6">
      {/* Header and selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/profesor')}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="text-primary" />
              Calificación de Entregas
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Asigne y modifique calificaciones del curso.</p>
          </div>
        </div>

        {/* Course & Deliverable selectors */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Curso</span>
            <select
              className="input-field py-1 px-3 bg-white text-sm"
              value={cursoId}
              onChange={(e) => {
                const id = e.target.value;
                setCursoId(id);
                sessionStorage.setItem('calificacion_curso_id', id);
                setEntregableId('');
                sessionStorage.removeItem('calificacion_entregable_id');
              }}
              disabled={loadingCursos}
            >
              {cursos.map(c => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.codigo} - {c.seccion}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Entregable</span>
            <select
              className="input-field py-1 px-3 bg-white text-sm min-w-[150px]"
              value={entregableId}
              onChange={(e) => {
                const id = e.target.value;
                setEntregableId(id);
                sessionStorage.setItem('calificacion_entregable_id', id);
              }}
              disabled={entregables.length === 0 || loadingCursos}
            >
              {entregables.length > 0 ? (
                entregables.map(e => (
                  <option key={e.id_entregable} value={e.id_entregable}>
                    {e.titulo}
                  </option>
                ))
              ) : (
                <option value="">Sin entregables</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI section */}
      {currentCourse && currentEntregable && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl">
          <div className="text-center sm:text-left">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Curso Seleccionado</p>
            <p className="text-base font-bold text-gray-900 mt-0.5 truncate">{currentCourse.nombre}</p>
            <p className="text-xs text-gray-600">Entregable: {currentEntregable.titulo}</p>
          </div>
          <div className="text-center border-t sm:border-t-0 sm:border-l border-emerald-200/60 pt-2 sm:pt-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Por Calificar</p>
            <p className="text-xl font-bold text-emerald-950 mt-0.5">{entregadosCount}</p>
          </div>
          <div className="text-center border-t sm:border-t-0 sm:border-l border-emerald-200/60 pt-2 sm:pt-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Calificados</p>
            <p className="text-xl font-bold text-emerald-950 mt-0.5">{calificadosCount} / {totalAlumnos}</p>
          </div>
          <div className="text-center border-t sm:border-t-0 sm:border-l border-emerald-200/60 pt-2 sm:pt-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">Sin Entregar</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{pendientesCount}</p>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <Card className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {/* Search header */}
        <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h4 className="font-bold text-gray-800 text-sm">Estudiantes Matriculados</h4>
          <div className="relative w-full sm:w-[300px]">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              className="input-field pl-9 py-1.5 text-sm bg-white"
              placeholder="Buscar alumno por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loadingGrid}
            />
          </div>
        </div>

        {loadingGrid ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 font-medium">Cargando datos de evaluación...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 flex flex-col items-center justify-center gap-2">
            <HelpCircle size={36} />
            <p className="font-semibold">{error}</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Enviado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Archivo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nota</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredStudents.map((student) => {
                  let badgeVariant: 'neutral' | 'success' | 'warning' | 'error' = 'neutral';
                  let statusLabel = student.estado_calificacion;

                  if (student.estado_calificacion === 'Calificado') {
                    badgeVariant = 'success';
                  } else if (student.estado_calificacion === 'Entregado') {
                    badgeVariant = 'neutral';
                  } else if (student.estado_calificacion === 'Tardío') {
                    badgeVariant = 'warning';
                  } else if (student.estado_calificacion === 'No Entregado') {
                    badgeVariant = 'error';
                  }

                  const hasEntrega = !!student.entrega;
                  const isGraded = !!student.entrega?.revision;
                  const score = student.entrega?.revision?.nota;

                  return (
                    <tr key={student.id_alumno} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {student.codigo_institucional || '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {student.nombre_completo}
                        <span className="text-[10px] text-gray-400 block font-normal mt-0.5">{student.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={badgeVariant} label={statusLabel} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {student.entrega
                          ? formatInLimaTimezone(student.entrega.timestamp_servidor, 'full')
                          : '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                        {student.entrega ? (
                          <a
                            href={student.entrega.drive_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
                            title={student.entrega.nombre_archivo}
                          >
                            {student.entrega.nombre_archivo}
                          </a>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {isGraded && score !== null && score !== undefined ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            {score.toFixed(2)} / 20
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {hasEntrega ? (
                          <button
                            onClick={() => handleOpenEvalModal(student)}
                            className="flex items-center text-primary hover:text-primary-dark font-bold underline transition-colors"
                          >
                            {isGraded ? (
                              <>
                                <Edit3 size={14} className="mr-1" />
                                Modificar
                              </>
                            ) : (
                              <>
                                <Check size={14} className="mr-1" />
                                Evaluar
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
            <Clipboard size={40} className="text-gray-300" />
            <p className="font-medium">No se encontraron estudiantes matriculados</p>
            <p className="text-xs max-w-sm text-gray-400">
              {entregableId ? 'No hay alumnos que coincidan con la búsqueda.' : 'Seleccione un curso y entregable válido.'}
            </p>
          </div>
        )}
      </Card>

      {/* Evaluar Modal */}
      {evalModalOpen && evalSelectedStudent && (
        <ModalEvaluar
          isOpen={evalModalOpen}
          onClose={() => {
            setEvalModalOpen(false);
            setEvalSelectedStudent(null);
          }}
          onSuccess={handleEvalSuccess}
          student={evalSelectedStudent}
        />
      )}
    </div>
  );
};

export default CalificacionProfesor;
