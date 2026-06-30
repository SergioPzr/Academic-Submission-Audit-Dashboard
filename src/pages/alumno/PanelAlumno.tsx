import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getKPIsAlumno, 
  getEntregablesActivos, 
  type EntregableConEstado, 
  type AlumnoKPIs 
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
  FileCheck 
} from 'lucide-react';
import Button from '../../components/ui/Button';

const PanelAlumno: React.FC = () => {
  const { perfil } = useAuth();
  const [kpis, setKpis] = useState<AlumnoKPIs>({ activos: 0, urgentes: 0, vencidos: 0, calificados: 0 });
  const [entregables, setEntregables] = useState<EntregableConEstado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals state
  const [selectedEntregable, setSelectedEntregable] = useState<EntregableConEstado | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedConstancia, setSelectedConstancia] = useState<any | null>(null);
  const [isConstanciaOpen, setIsConstanciaOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!perfil?.id) return;
    try {
      const [kpiData, entregablesData] = await Promise.all([
        getKPIsAlumno(perfil.id),
        getEntregablesActivos(perfil.id)
      ]);
      setKpis(kpiData);
      setEntregables(entregablesData);
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    if (!perfil?.id) return;
    
    loadData();

    // Set up Realtime subscriptions to automatically refresh the panel
    const entregasSubscription = supabase
      .channel('alumno-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas', filter: `id_alumno=eq.${perfil.id}` },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'revisiones' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(entregasSubscription);
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
    loadData(); // Reload KPIs and delivery statuses
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Filter deliverables
  const activeDeliverables = entregables.filter(e => e.estado_entrega !== 'calificado');
  const gradedDeliverables = entregables.filter(e => e.estado_entrega === 'calificado');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido, {perfil?.nombre_completo}!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Código: <span className="font-mono font-semibold">{perfil?.codigo_institucional || 'N/A'}</span> · {perfil?.facultad || 'Facultad de Ingeniería'}
          </p>
        </div>
        <div className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border flex items-center gap-1.5">
          <Clock size={14} />
          <span>Hora Local (PET): {formatInLimaTimezone(new Date())}</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Entregables Activos" 
          value={kpis.activos} 
          icon={<BookOpen size={24} className="text-emerald-700" />}
          className="border-l-4 border-l-emerald-600"
        />
        <StatCard 
          label="Pendientes <24h" 
          value={kpis.urgentes} 
          icon={<Clock size={24} className="text-amber-500" />}
          className="border-l-4 border-l-amber-500"
        />
        <StatCard 
          label="Trabajos Vencidos" 
          value={kpis.vencidos} 
          icon={<AlertTriangle size={24} className="text-red-500" />}
          className="border-l-4 border-l-red-500"
        />
        <StatCard 
          label="Entregas Calificadas" 
          value={kpis.calificados} 
          icon={<CheckSquare size={24} className="text-purple-600" />}
          className="border-l-4 border-l-purple-600"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Active Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className="text-emerald-800" />
              <span>Entregables Activos y Pendientes</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">Mostrando {activeDeliverables.length} actividades</span>
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
                  <Card key={entregable.id_entregable} className="p-5 hover:shadow-md transition duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 max-w-xl">
                        {/* Course & Section */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {entregable.curso_codigo} - Sec. {entregable.curso_seccion}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">{entregable.curso_nombre}</span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                            {entregable.titulo}
                            {entregable.tiene_prorroga && (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.25 rounded" title="Plazo extendido por el profesor">
                                PRÓRROGA
                              </span>
                            )}
                          </h3>
                          {entregable.descripcion && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{entregable.descripcion}</p>
                          )}
                        </div>

                        {/* Deadline details */}
                        <div className="text-xs text-gray-400">
                          Cierre: <span className="font-semibold text-gray-600">{formatInLimaTimezone(entregable.fecha_cierre_efectiva)}</span>
                        </div>
                      </div>

                      {/* Right Action side */}
                      <div className="flex flex-col items-end justify-between min-w-[160px] gap-3">
                        {/* Countdown / Status badge */}
                        {!hasSubmission && !isExpired && (
                          <Countdown fechaCierre={entregable.fecha_cierre_efectiva} />
                        )}

                        {hasSubmission && (
                          <Badge 
                            variant={entregable.estado_entrega === 'entregado_a_tiempo' ? 'success' : 'warning'}
                            label={entregable.estado_entrega === 'entregado_a_tiempo' ? 'Entregado a Tiempo' : 'Entregado con Tardanza'}
                          />
                        )}

                        {!hasSubmission && isExpired && (
                          <Badge variant="error" label="No Entregado / Cerrado" />
                        )}

                        {/* Action buttons */}
                        <div className="w-full flex justify-end">
                          {hasSubmission ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-xs flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-semibold"
                              onClick={() => handleVerConstanciaClick(
                                entregable.entrega, 
                                entregable.curso_nombre, 
                                entregable.titulo
                              )}
                            >
                              <FileText size={14} />
                              <span>Ver Constancia</span>
                            </Button>
                          ) : !isExpired || entregable.admite_extemporaneas ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full md:w-auto text-xs font-semibold px-4 py-2 flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800"
                              onClick={() => handleEntregarClick(entregable)}
                            >
                              <span>Subir Trabajo</span>
                              <ArrowRight size={14} />
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full md:w-auto text-xs font-semibold cursor-not-allowed opacity-50"
                              disabled
                            >
                              Cerrado
                            </Button>
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

        {/* Right: Recently Graded */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileCheck size={20} className="text-purple-600" />
            <span>Calificados Recientemente</span>
          </h2>

          {gradedDeliverables.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border text-center text-gray-500 text-sm">
              No tienes calificaciones registradas en este periodo.
            </div>
          ) : (
            <div className="space-y-4">
              {gradedDeliverables.map((entregable) => {
                const revision = entregable.entrega?.revision;
                return (
                  <Card key={entregable.id_entregable} className="p-4 border border-purple-100 hover:shadow-sm transition">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{entregable.titulo}</h4>
                          <span className="text-xs text-gray-400 font-semibold">{entregable.curso_codigo}</span>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg text-center shrink-0">
                          <span className="block text-[10px] text-purple-700 uppercase font-bold tracking-wider">Nota</span>
                          <span className="text-base font-bold text-purple-800 font-mono">
                            {revision?.nota !== null && revision?.nota !== undefined ? String(revision.nota).padStart(2, '0') : 'NE'}
                          </span>
                        </div>
                      </div>

                      {revision?.retroalimentacion && (
                        <div className="text-xs bg-slate-50 p-2.5 rounded border italic text-gray-600">
                          &ldquo;{revision.retroalimentacion}&rdquo;
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>Evaluado: {revision?.fecha_evaluacion ? formatInLimaTimezone(revision.fecha_evaluacion, 'date') : 'N/A'}</span>
                        <button 
                          className="text-purple-700 hover:underline font-semibold"
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
