import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getKPIsAlumno, 
  getEntregablesActivos, 
  getCursosMatriculadosAlumno,
  type EntregableConEstado, 
  type AlumnoKPIs,
  type CursoMatriculado
} from '../../services/entregasService';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import { supabase } from '../../services/supabase';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Countdown from '../../components/shared/Countdown';
import ModalEntrega from './ModalEntrega';
import ConstanciaModal from './ConstanciaModal';
import { 
  BookOpen, 
  Clock, 
  AlertTriangle, 
  CheckSquare, 
  FileText, 
  Calendar, 
  ArrowRight, 
  FileCheck,
  User,
  GraduationCap
} from 'lucide-react';
import Button from '../../components/ui/Button';

const PanelAlumno: React.FC = () => {
  const { perfil } = useAuth();
  const [kpis, setKpis] = useState<AlumnoKPIs>({ activos: 0, urgentes: 0, vencidos: 0, calificados: 0 });
  const [entregables, setEntregables] = useState<EntregableConEstado[]>([]);
  const [cursosMatriculados, setCursosMatriculados] = useState<CursoMatriculado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals state
  const [selectedEntregable, setSelectedEntregable] = useState<EntregableConEstado | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedConstancia, setSelectedConstancia] = useState<any | null>(null);
  const [isConstanciaOpen, setIsConstanciaOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!perfil?.id) return;
    try {
      const [kpiData, entregablesData, cursosData] = await Promise.all([
        getKPIsAlumno(perfil.id),
        getEntregablesActivos(perfil.id),
        getCursosMatriculadosAlumno(perfil.id)
      ]);
      setKpis(kpiData);
      setEntregables(entregablesData);
      setCursosMatriculados(cursosData);
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil?.id) return;
    
    loadData();

    // Suscripción 1: Cambios en 'entregas' del alumno (nueva entrega, reemplazo)
    const entregasChannel = supabase
      .channel('alumno-entregas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas', filter: `id_alumno=eq.${perfil.id}` },
        () => {
          console.log('Realtime change detected in entregas, reloading data...');
          loadData();
        }
      )
      .subscribe();

    // Suscripción 2: Cambios en 'revisiones' (calificaciones de profesores)
    const revisionesChannel = supabase
      .channel('alumno-revisiones-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'revisiones' },
        () => {
          console.log('Realtime change detected in revisiones, reloading data...');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entregasChannel);
      supabase.removeChannel(revisionesChannel);
    };
  }, [perfil?.id, loadData]);

  const handleEntregarClick = (entregable: EntregableConEstado) => {
    setSelectedEntregable(entregable);
    setIsUploadOpen(true);
  };

  const handleVerConstanciaClick = (entrega: any, courseName: string, title: string) => {
    setSelectedConstancia({
      constancia_id: entrega.constancia_id,
      timestamp_servidor: entrega.timestamp_servidor,
      nombre_archivo: entrega.nombre_archivo,
      tamano_bytes: entrega.tamano_bytes,
      file_hash: entrega.file_hash,
      drive_url: entrega.drive_url,
      estado_puntualidad: entrega.estado_puntualidad,
      curso_nombre: courseName,
      entregable_titulo: title
    });
    setIsConstanciaOpen(true);
  };

  const handleUploadSuccess = (constanciaData: any) => {
    setSelectedConstancia(constanciaData);
    setIsConstanciaOpen(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  // Filter deliverables
  const activeDeliverables = entregables.filter(e => e.estado_entrega !== 'calificado');
  const gradedDeliverables = entregables.filter(e => e.estado_entrega === 'calificado');

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 lg:p-8 rounded-2xl border border-emerald-900/20 shadow-sm text-white">
        {/* Glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-emerald-400 w-6 h-6" />
              <span className="text-xs font-bold tracking-widest uppercase text-emerald-300">Estudiante URP</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              ¡Bienvenido, {perfil?.nombre_completo}!
            </h1>
            <p className="text-xs text-emerald-200/80 font-medium">
              Código Institucional: <span className="font-mono font-bold bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-800/40 text-emerald-100">{perfil?.codigo_institucional || 'N/A'}</span> · {perfil?.facultad || 'Facultad de Ingeniería'}
            </p>
          </div>
          
          <div className="bg-emerald-900/40 border border-emerald-800/40 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-200 shrink-0">
            <Clock size={16} className="text-emerald-400" />
            <span>Zona Horaria (Lima): {formatInLimaTimezone(new Date())}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Entregables Activos" 
          value={kpis.activos} 
          icon={<BookOpen size={22} className="text-emerald-700" />}
          className="border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all duration-200"
        />
        <StatCard 
          label="Urgentes (< 24 hrs)" 
          value={kpis.urgentes} 
          icon={<Clock size={22} className="text-amber-600" />}
          className="border border-slate-100 bg-white hover:border-amber-200 hover:shadow-md transition-all duration-200"
        />
        <StatCard 
          label="Actividades Vencidas" 
          value={kpis.vencidos} 
          icon={<AlertTriangle size={22} className="text-red-500" />}
          className="border border-slate-100 bg-white hover:border-red-200 hover:shadow-md transition-all duration-200"
        />
        <StatCard 
          label="Calificaciones Listas" 
          value={kpis.calificados} 
          icon={<CheckSquare size={22} className="text-purple-600" />}
          className="border border-slate-100 bg-white hover:border-purple-200 hover:shadow-md transition-all duration-200"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle: Active Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-emerald-700" />
              <span>Entregables Activos y Pendientes</span>
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-200">
              {activeDeliverables.length} actividades
            </span>
          </div>

          {activeDeliverables.length === 0 ? (
            <EmptyState 
              title="No hay entregables pendientes" 
              description="Estás al día con todos tus entregables académicos."
            />
          ) : (
            <div className="space-y-4">
              {activeDeliverables.map((entregable) => {
                const hasSubmission = !!entregable.entrega;
                const isExpired = new Date(entregable.fecha_cierre_efectiva) < new Date();
                
                return (
                  <Card key={entregable.id_entregable} className="p-6 hover:shadow-md border border-slate-100 transition-all duration-200 bg-white rounded-2xl relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="space-y-3 max-w-xl text-left">
                        {/* Course & Section */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50 uppercase tracking-wider">
                            {entregable.curso_codigo} · Sec. {entregable.curso_seccion}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">{entregable.curso_nombre}</span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            {entregable.titulo}
                            {entregable.tiene_prorroga && (
                              <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded uppercase tracking-wider">
                                Prórroga
                              </span>
                            )}
                          </h3>
                          {entregable.descripcion && (
                            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{entregable.descripcion}</p>
                          )}
                        </div>

                        {/* Deadline details */}
                        <div className="text-xs text-slate-400 font-medium">
                          Cierre: <span className="font-semibold text-slate-600">{formatInLimaTimezone(entregable.fecha_cierre_efectiva)}</span>
                        </div>
                      </div>

                      {/* Right Action side */}
                      <div className="flex flex-col items-end justify-between min-w-[170px] gap-4">
                        {/* Countdown / Status badge */}
                        {!hasSubmission && !isExpired && (
                          <Countdown fechaCierre={entregable.fecha_cierre_efectiva} />
                        )}

                        {hasSubmission && (
                          <Badge 
                            variant={entregable.estado_entrega === 'entregado_a_tiempo' ? 'success' : 'warning'}
                            label={entregable.estado_entrega === 'entregado_a_tiempo' ? 'A Tiempo' : 'Tardía'}
                          />
                        )}

                        {!hasSubmission && isExpired && (
                          <Badge variant="error" label="No Entregado" />
                        )}

                        {/* Action buttons */}
                        <div className="w-full flex justify-end">
                          {hasSubmission ? (
                            <button 
                              className="text-xs flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold border border-emerald-200/50 hover:bg-emerald-50 px-3 py-2 rounded-xl transition duration-200"
                              onClick={() => handleVerConstanciaClick(
                                entregable.entrega, 
                                entregable.curso_nombre, 
                                entregable.titulo
                              )}
                            >
                              <FileText size={14} />
                              <span>Comprobante</span>
                            </button>
                          ) : !isExpired || entregable.admite_extemporaneas ? (
                            <button
                              className="w-full md:w-auto text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-lg transition duration-200"
                              onClick={() => handleEntregarClick(entregable)}
                            >
                              <span>Subir Trabajo</span>
                              <ArrowRight size={14} />
                            </button>
                          ) : (
                            <button
                              className="w-full md:w-auto text-xs font-bold py-2.5 px-4 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl cursor-not-allowed"
                              disabled
                            >
                              Cerrado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Enrolled Courses & Recently Graded */}
        <div className="space-y-8">
          
          {/* Section: Enrolled Courses */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-700" />
              <span>Mis Cursos Matriculados</span>
            </h2>

            {cursosMatriculados.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-450 text-sm font-semibold">
                No estás matriculado en ninguna asignatura.
              </div>
            ) : (
              <div className="space-y-3.5">
                {cursosMatriculados.map((c) => (
                  <Card key={c.id_curso} className="p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-200 bg-white rounded-2xl text-left">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{c.nombre}</span>
                        <Badge label={c.seccion} variant="neutral" />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span>Código: <span className="text-slate-500 font-mono">{c.codigo}</span></span>
                        <span>Ciclo: <span className="text-slate-500">{c.ciclo_academico}</span></span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2">
                        Docente: <strong className="text-slate-600">{c.docente_nombre}</strong>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right: Recently Graded */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileCheck size={18} className="text-purple-600" />
              <span>Calificados Recientemente</span>
            </h2>

          {gradedDeliverables.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 text-sm font-semibold">
              No tienes calificaciones registradas en este periodo.
            </div>
          ) : (
            <div className="space-y-4">
              {gradedDeliverables.map((entregable) => {
                const revision = entregable.entrega?.revision;
                return (
                  <Card key={entregable.id_entregable} className="p-5 border border-purple-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 bg-white rounded-2xl text-left">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{entregable.titulo}</h4>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{entregable.curso_codigo}</span>
                        </div>
                        
                        {/* Grade Bubble */}
                        <div className="bg-purple-50/80 border border-purple-200/50 px-3.5 py-1 rounded-xl text-center shrink-0">
                          <span className="block text-[8px] text-purple-700 uppercase font-extrabold tracking-widest">Nota</span>
                          <span className="text-lg font-black text-purple-800 font-mono">
                            {revision?.nota !== null && revision?.nota !== undefined 
                              ? String(revision.nota.toFixed(1)).padStart(4, '0') 
                              : 'N/E'}
                          </span>
                        </div>
                      </div>

                      {revision?.retroalimentacion && (
                        <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl italic text-slate-600 leading-relaxed">
                          &ldquo;{revision.retroalimentacion}&rdquo;
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium border-t border-slate-50 pt-3">
                        <span>Evaluado: {revision?.fecha_evaluacion ? formatInLimaTimezone(revision.fecha_evaluacion, 'date') : 'N/A'}</span>
                        <button 
                          className="text-purple-700 hover:text-purple-950 font-bold"
                          onClick={() => handleVerConstanciaClick(
                            entregable.entrega, 
                            entregable.curso_nombre, 
                            entregable.titulo
                          )}
                        >
                          Ver comprobante
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>

      {/* Modals */}
      <ModalEntrega
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        entregable={selectedEntregable}
        onSuccess={handleUploadSuccess}
      />

      <ConstanciaModal
        isOpen={isConstanciaOpen}
        onClose={() => setIsConstanciaOpen(false)}
        constancia={selectedConstancia}
      />
    </div>
  );
};

export default PanelAlumno;
