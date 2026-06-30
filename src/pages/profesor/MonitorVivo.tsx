import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { getMisCursos } from '../../services/cursosService';
import type { CursoConStats } from '../../services/cursosService';
import { getEntregablesPorCurso, getAlumnosPorCurso } from '../../services/entregablesService';
import type { Entregable, AlumnoMatriculado } from '../../services/entregablesService';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import { Play, Pause, AlertCircle, Clock, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

interface SubmissionWithDetails {
  id_entrega: string;
  id_alumno: string;
  nombre_archivo: string;
  tamano_bytes: number;
  drive_url: string;
  estado_puntualidad: string;
  timestamp_servidor: string;
  alumno_nombre: string;
  alumno_codigo: string;
}

const MonitorVivo: React.FC = () => {
  const { perfil } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected course & deliverable IDs
  const [cursoId, setCursoId] = useState<string>(searchParams.get('cursoId') || '');
  const [entregableId, setEntregableId] = useState<string>(searchParams.get('entregableId') || '');

  // Selectable options
  const [cursos, setCursos] = useState<CursoConStats[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [alumnosMap, setAlumnosMap] = useState<Record<string, AlumnoMatriculado>>({});

  // Submissions state
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [isActive, setIsActive] = useState(true);
  const channelRef = useRef<any>(null);

  // Force re-renders for relative times
  const [, setTick] = useState(0);

  // 1. Fetch professor's courses
  useEffect(() => {
    const fetchCursos = async () => {
      if (!perfil?.id) return;
      try {
        const list = await getMisCursos(perfil.id);
        setCursos(list);
        
        // If courseId is not set, set it to the first course
        if (!cursoId && list.length > 0) {
          setCursoId(list[0].id_curso);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
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
        
        // If entregableId is not set or not in list, set to first
        if (list.length > 0) {
          const exists = list.some(e => e.id_entregable === entregableId);
          if (!exists) {
            setEntregableId(list[0].id_entregable);
          }
        } else {
          setEntregableId('');
        }
      } catch (err) {
        console.error('Error fetching deliverables:', err);
      }
    };
    fetchEntregables();
  }, [cursoId, entregableId]);

  // 3. Fetch students to map details locally
  useEffect(() => {
    const fetchStudents = async () => {
      if (!cursoId) return;
      try {
        const list = await getAlumnosPorCurso(cursoId);
        const map: Record<string, AlumnoMatriculado> = {};
        list.forEach((a) => {
          map[a.id] = a;
        });
        setAlumnosMap(map);
      } catch (err) {
        console.error('Error mapping students:', err);
      }
    };
    fetchStudents();
  }, [cursoId]);

  // 4. Update relative times every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // 5. Load submissions and subscribe to Realtime
  const loadSubmissions = useCallback(async () => {
    if (!entregableId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('entregas')
        .select('*')
        .eq('id_entregable', entregableId)
        .order('timestamp_servidor', { ascending: false });

      if (dbError) throw dbError;

      const formatted = (data || []).map((e: any) => {
        const student = alumnosMap[e.id_alumno];
        return {
          ...e,
          alumno_nombre: student?.nombre_completo || 'Alumno Desconocido',
          alumno_codigo: student?.codigo_institucional || '---',
        };
      });

      setSubmissions(formatted);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar entregas iniciales');
    } finally {
      setLoading(false);
    }
  }, [entregableId, alumnosMap]);

  // Handle load triggers
  useEffect(() => {
    if (Object.keys(alumnosMap).length > 0 && entregableId) {
      loadSubmissions();
    }
  }, [entregableId, alumnosMap, loadSubmissions]);

  // Setup Realtime subscription
  useEffect(() => {
    if (!entregableId || !isActive) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`monitor-entregas-${entregableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entregas',
          filter: `id_entregable=eq.${entregableId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;
          
          if (eventType === 'INSERT') {
            const newEntrega = payload.new as any;
            const student = alumnosMap[newEntrega.id_alumno];
            const fullEntrega: SubmissionWithDetails = {
              ...newEntrega,
              alumno_nombre: student?.nombre_completo || 'Alumno Desconocido',
              alumno_codigo: student?.codigo_institucional || '---',
            };
            setSubmissions(prev => [fullEntrega, ...prev]);
          } else if (eventType === 'UPDATE') {
            const updatedEntrega = payload.new as any;
            setSubmissions(prev =>
              prev.map(e =>
                e.id_entrega === updatedEntrega.id_entrega
                  ? {
                      ...e,
                      ...updatedEntrega,
                    }
                  : e
              )
            );
          } else if (eventType === 'DELETE') {
            const oldId = payload.old.id_entrega;
            setSubmissions(prev => prev.filter(e => e.id_entrega !== oldId));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [entregableId, isActive, alumnosMap]);

  const handleToggleActive = () => {
    if (!isActive) {
      loadSubmissions();
    }
    setIsActive(!isActive);
  };

  const getRelativeTime = (isoString: string): string => {
    const diff = new Date().getTime() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Hace unos segundos';
    if (minutes === 1) return 'Hace 1 minuto';
    if (minutes < 60) return `Hace ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'Hace 1 hora';
    if (hours < 24) return `Hace ${hours} horas`;
    
    return formatInLimaTimezone(isoString, 'full');
  };

  const formatTimeOnly = (isoString: string): string => {
    return formatInLimaTimezone(isoString, 'time');
  };

  const totalSubmissions = submissions.length;
  const aTiempo = submissions.filter(s => s.estado_puntualidad === 'A Tiempo').length;
  const tardias = submissions.filter(s => s.estado_puntualidad === 'Tardía').length;

  const currentCourseObj = cursos.find(c => c.id_curso === cursoId);
  const currentDeliverableObj = entregables.find(e => e.id_entregable === entregableId);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Back button and selectors */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/profesor')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <span>Monitor en Vivo</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-emerald-50 text-emerald-700 animate-pulse border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {isActive ? 'EN VIVO' : 'PAUSADO'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {isActive ? 'Auto-actualiza en tiempo real' : 'Actualización en tiempo real pausada'}
            </p>
          </div>
        </div>

        {/* Dropdown Selectors */}
        <div className="flex flex-wrap gap-3 items-end w-full md:w-auto">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Curso</span>
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              value={cursoId}
              onChange={(e) => {
                setCursoId(e.target.value);
                setEntregableId('');
              }}
            >
              {cursos.map(c => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.codigo} - {c.seccion}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Entregable</span>
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-500 transition cursor-pointer min-w-[150px]"
              value={entregableId}
              onChange={(e) => setEntregableId(e.target.value)}
              disabled={entregables.length === 0}
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

          <Button
            onClick={handleToggleActive}
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            disabled={!entregableId}
            icon={isActive ? <Pause size={14} /> : <Play size={14} />}
          >
            {isActive ? 'Pausar' : 'Reanudar'}
          </Button>
        </div>
      </div>

      {/* Subheader Information */}
      {currentCourseObj && currentDeliverableObj && (
        <div className="bg-emerald-950 text-white p-5 rounded-2xl shadow-sm border border-emerald-900 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Curso Activo
            </span>
            <h3 className="text-base font-bold mt-1">
              {currentCourseObj.nombre} <span className="text-emerald-300">({currentCourseObj.codigo} · Sec {currentCourseObj.seccion})</span>
            </h3>
            <p className="text-xs text-emerald-200 mt-1">
              <strong>Ventana:</strong> {currentDeliverableObj.titulo}
            </p>
          </div>
          <div className="sm:text-right sm:border-l sm:border-emerald-800/80 sm:pl-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Fecha de Cierre (Lima)
            </span>
            <span className="text-xs font-bold block mt-1.5">
              {formatInLimaTimezone(currentDeliverableObj.fecha_cierre, 'full')}
            </span>
          </div>
        </div>
      )}

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock size={20} />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entregas en Sesión</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalSubmissions}</p>
          </div>
        </Card>
        
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">A Tiempo</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{aTiempo}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tardías</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-0.5">{tardias}</p>
          </div>
        </Card>
      </div>

      {/* Main Table Panel */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historial de cargas en tiempo real</h4>
          <button
            onClick={loadSubmissions}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            title="Refrescar"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-400 font-bold">Cargando monitor de entregas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-600 gap-2">
            <AlertCircle size={32} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Alumno</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Archivo</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub.id_entrega} className="hover:bg-slate-50/30 transition animate-fade-in">
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <span className="font-bold text-slate-800 font-mono block">{formatTimeOnly(sub.timestamp_servidor)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">{getRelativeTime(sub.timestamp_servidor)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700 font-mono">
                      {sub.alumno_codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 text-left">
                      {sub.alumno_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left max-w-xs truncate" title={sub.nombre_archivo}>
                      <a
                        href={sub.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-bold underline"
                      >
                        {sub.nombre_archivo}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={sub.estado_puntualidad === 'A Tiempo' ? 'success' : 'warning'}
                        label={sub.estado_puntualidad}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold">
                      <button
                        onClick={() => {
                          sessionStorage.setItem('calificacion_curso_id', cursoId);
                          sessionStorage.setItem('calificacion_entregable_id', entregableId);
                          navigate('/profesor/calificacion');
                        }}
                        className="text-emerald-700 hover:text-emerald-800 underline"
                      >
                        Calificar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-450 flex flex-col items-center justify-center space-y-3">
            <Clock size={36} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Aún no se han recibido entregas</p>
            <p className="text-xs max-w-sm text-slate-400 font-medium leading-relaxed">
              Las entregas que realicen los alumnos matriculados aparecerán aquí de forma instantánea.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MonitorVivo;
