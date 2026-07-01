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
import { getEntregasPorEntregable, evaluarEntrega, modificarEvaluacion, exportarReporteCSV } from '../../services/calificacionService';
import type { AlumnoCalificacion } from '../../services/calificacionService';
import { formatInLimaTimezone, formatBytes } from '../../utils/dateUtils';
import { ArrowLeft, Search, FileText, Check, Edit3, Clipboard, HelpCircle, GraduationCap, Info } from 'lucide-react';

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
  const modificacionesCount = student.entrega?.revision?.modificaciones_count || 0;
  const attemptsLeft = Math.max(0, 3 - modificacionesCount);
  const isEditingDisabled = isEditing && attemptsLeft <= 0;

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

    if (isEditingDisabled) {
      setError('Límite de modificaciones alcanzado (3/3)');
      return;
    }

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
      <div className="modal-box p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Modificar Calificación' : 'Evaluar Entrega'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold transition">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {isEditing && (
          <div className="text-xs font-bold text-slate-500 bg-slate-50 border p-3 rounded-xl flex justify-between items-center">
            <span>Modificaciones realizadas: <span className="text-slate-800">{modificacionesCount}/3</span></span>
            {attemptsLeft > 0 ? (
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {attemptsLeft} intentos restantes
              </span>
            ) : (
              <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                Límite alcanzado
              </span>
            )}
          </div>
        )}

        {isEditingDisabled && (
          <div className="bg-amber-50 text-amber-800 p-3.5 border border-amber-200 rounded-xl text-xs font-bold leading-relaxed">
            ⚠️ Límite de modificaciones alcanzado (3 de 3). Solo se permite visualizar la calificación.
          </div>
        )}

        {/* Alumno Info */}
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs space-y-1.5 text-slate-700 text-left">
          <p><strong>Alumno:</strong> {student.nombre_completo}</p>
          <p><strong>Código:</strong> {student.codigo_institucional || '---'}</p>
          {student.entrega && (
            <>
              <p><strong>Archivo:</strong> {student.entrega.nombre_archivo} ({formatBytes(student.entrega.tamano_bytes)})</p>
              <p><strong>Fecha envío:</strong> {formatInLimaTimezone(student.entrega.timestamp_servidor, 'full')}</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {student.entrega?.drive_url && (
            <a
              href={student.entrega.drive_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center py-3 border border-dashed border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <FileText size={16} className="mr-2 text-emerald-600" />
              Abrir Archivo de Entrega
            </a>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nota (0.00 a 20.00)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              placeholder="Ej. 17.5"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              required
              disabled={loading || isEditingDisabled}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Retroalimentación / Comentarios</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 min-h-[100px] transition-all duration-200 disabled:opacity-60"
              placeholder="Escriba aquí los comentarios de la evaluación..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={loading || isEditingDisabled}
              maxLength={500}
            />
            <div className="text-right text-[10px] text-slate-400 font-bold mt-1">
              {feedback.length}/500 caracteres
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={isEditingDisabled || loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Guardar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CalificacionProfesor: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const [cursoId, setCursoId] = useState<string>(sessionStorage.getItem('calificacion_curso_id') || '');
  const [entregableId, setEntregableId] = useState<string>(sessionStorage.getItem('calificacion_entregable_id') || '');

  const [cursos, setCursos] = useState<CursoConStats[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  const [students, setStudents] = useState<AlumnoCalificacion[]>([]);
  const [search, setSearch] = useState('');
  
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evalSelectedStudent, setEvalSelectedStudent] = useState<AlumnoCalificacion | null>(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleExportReport = async () => {
    const currentCourse = cursos.find(c => c.id_curso === cursoId);
    const currentEntregable = entregables.find(e => e.id_entregable === entregableId);

    if (filteredStudents.length === 0) {
      setMessage({ text: 'No existen registros para los parámetros seleccionados', type: 'error' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    try {
      const blob = await exportarReporteCSV(
        cursoId,
        entregableId,
        currentCourse?.nombre || 'Curso',
        currentEntregable?.titulo || 'Entregable'
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const safeCourseName = (currentCourse?.nombre || 'curso')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `reporte_${safeCourseName}_${dateStr}.csv`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({ text: 'Reporte de calificaciones exportado exitosamente', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || 'Error al exportar el reporte', type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

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
    <div className="space-y-6 text-left">
      {message && (
        <div 
          className="p-4 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fade-in"
          style={{
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderColor: message.type === 'success' ? '#A7F3D0' : '#FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
          }}
        >
          <Info size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Header and selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profesor')}
            className="p-2.5 rounded-xl border hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="text-emerald-700 w-6 h-6" />
              <span>Calificación de Entregas</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">Asigne y modifique calificaciones de entregables.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Curso</span>
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
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
                  {c.codigo.trim()} - {c.nombre} (Sec. {c.seccion.trim()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Entregable</span>
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-emerald-50/40 p-5 border border-emerald-100 rounded-2xl">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold">Curso / Actividad</p>
            <p className="text-sm font-bold text-slate-800 mt-1 truncate">{currentCourse.nombre}</p>
            <p className="text-xs text-slate-500 font-medium">{currentEntregable.titulo}</p>
          </div>
          <div className="border-l border-emerald-200/50 pl-4">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold">Por Calificar</p>
            <p className="text-lg font-black text-slate-800 mt-1">{entregadosCount}</p>
          </div>
          <div className="border-l border-emerald-200/50 pl-4">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold">Calificados</p>
            <p className="text-lg font-black text-slate-800 mt-1">{calificadosCount} / {totalAlumnos}</p>
          </div>
          <div className="border-l border-emerald-200/50 pl-4">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold">Sin Entregar</p>
            <p className="text-lg font-black text-red-600 mt-1">{pendientesCount}</p>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Search header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h4 className="font-bold text-slate-800 text-sm">Alumnos y Estados</h4>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[250px]">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
                placeholder="Buscar alumno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loadingGrid}
              />
            </div>
            
            <button
              onClick={handleExportReport}
              disabled={loadingGrid || filteredStudents.length === 0}
              className="w-full sm:w-auto text-xs font-bold py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>

        {loadingGrid ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-bold">Cargando entregas...</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center text-red-500 flex flex-col items-center justify-center gap-2">
            <HelpCircle size={36} />
            <p className="font-bold text-sm">{error}</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Enviado</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Archivo</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nota</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
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
                    <tr key={student.id_alumno} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 font-mono">
                        {student.codigo_institucional || '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-left">
                        <p className="font-bold text-slate-800">{student.nombre_completo}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{student.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={badgeVariant} label={statusLabel} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                        {student.entrega
                          ? formatInLimaTimezone(student.entrega.timestamp_servidor, 'full')
                          : '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs max-w-[200px] truncate">
                        {student.entrega ? (
                          <a
                            href={student.entrega.drive_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
                            title={student.entrega.nombre_archivo}
                          >
                            {student.entrega.nombre_archivo}
                          </a>
                        ) : (
                          <span className="text-slate-400 font-medium">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                        {isGraded && score !== null && score !== undefined ? (
                          score < 11 ? (
                            <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/55 font-bold font-mono">
                              {score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50 font-bold font-mono">
                              {score.toFixed(1)}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {hasEntrega ? (
                          <button
                            onClick={() => handleOpenEvalModal(student)}
                            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-950 font-bold underline transition"
                          >
                            {isGraded ? (
                              <>
                                <Edit3 size={12} />
                                <span>Modificar</span>
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                <span>Evaluar</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium">---</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Clipboard size={40} className="text-slate-200" />
            <p className="font-bold text-sm">
              {search ? 'No existen registros para los parámetros seleccionados' : 'No se encontraron estudiantes matriculados'}
            </p>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed font-medium">
              {search ? 'Intente modificando los términos de búsqueda.' : (entregableId ? 'No hay alumnos matriculados en este curso.' : 'Seleccione un curso y entregable válido.')}
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
