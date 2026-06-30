import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getEntregablesActivos, type EntregableConEstado } from '../../services/entregasService';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ModalEntrega from './ModalEntrega';
import ConstanciaModal from './ConstanciaModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Info, 
  Clock, 
  AlertCircle, 
  FileText,
  X
} from 'lucide-react';

const DAYS_OF_WEEK = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CronogramaAlumno: React.FC = () => {
  const { perfil } = useAuth();
  const [entregables, setEntregables] = useState<EntregableConEstado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  
  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<EntregableConEstado | null>(null);
  
  // Child modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedConstancia, setSelectedConstancia] = useState<any | null>(null);
  const [isConstanciaOpen, setIsConstanciaOpen] = useState<boolean>(false);

  const loadEntregables = useCallback(async () => {
    if (!perfil?.id) return;
    try {
      const data = await getEntregablesActivos(perfil.id);
      setEntregables(data);
    } catch (err) {
      console.error('Error fetching calendar deliverables:', err);
    } finally {
      setLoading(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    loadEntregables();
  }, [loadEntregables]);

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const getMonthGridDays = (): Date[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const totalDaysInMonth = getDaysInMonth(year, month);
    const totalDaysInPrevMonth = getDaysInMonth(year, month - 1);

    const days: Date[] = [];

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, totalDaysInPrevMonth - i));
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month padding
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getWeekDays = (): Date[] => {
    const currentDay = currentDate.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - distanceToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Navigations
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else {
      newDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  const getDeliverablesForDate = (date: Date): EntregableConEstado[] => {
    return entregables.filter(item => {
      const closeDate = new Date(item.fecha_cierre_efectiva);
      return isSameDay(closeDate, date);
    });
  };

  const getEventColors = (item: EntregableConEstado) => {
    switch (item.estado_entrega) {
      case 'calificado':
        return {
          bg: 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700',
          dot: 'bg-slate-400'
        };
      case 'entregado_a_tiempo':
      case 'entregado_tardio':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'vencido':
        return {
          bg: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800',
          dot: 'bg-red-500'
        };
      case 'pendiente':
      default:
        const targetTime = new Date(item.fecha_cierre_efectiva).getTime();
        const difference = targetTime - Date.now();
        if (difference < 24 * 3600 * 1000) {
          return {
            bg: 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800',
            dot: 'bg-amber-500'
          };
        }
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500'
        };
    }
  };

  const handleEventClick = (item: EntregableConEstado, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(item);
  };

  const handleUploadClick = () => {
    if (!selectedEvent) return;
    setIsUploadOpen(true);
  };

  const handleVerConstanciaClick = () => {
    if (!selectedEvent || !selectedEvent.entrega) return;
    const ent = selectedEvent.entrega;
    setSelectedConstancia({
      constancia_id: ent.constancia_id,
      timestamp_servidor: ent.timestamp_servidor,
      nombre_archivo: ent.nombre_archivo,
      tamano_bytes: ent.tamano_bytes,
      file_hash: ent.file_hash,
      drive_url: ent.drive_url,
      estado_puntualidad: ent.estado_puntualidad,
      curso_nombre: selectedEvent.curso_nombre,
      entregable_titulo: selectedEvent.titulo
    });
    setIsConstanciaOpen(true);
  };

  const handleUploadSuccess = (constanciaData: any) => {
    setSelectedConstancia(constanciaData);
    setIsConstanciaOpen(true);
    setSelectedEvent(null);
    loadEntregables();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const gridDays = viewType === 'month' ? getMonthGridDays() : getWeekDays();
  const currentMonthLabel = viewType === 'month' 
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : `Semana del ${formatInLimaTimezone(gridDays[0], 'date')} al ${formatInLimaTimezone(gridDays[6], 'date')}`;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Calendar Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{currentMonthLabel}</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Cronograma Académico Personalizado</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Navigation Controls */}
          <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <button 
              onClick={handlePrev}
              className="p-2 hover:bg-slate-50 border-r border-slate-200 transition"
              title="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleToday}
              className="px-3.5 py-2 hover:bg-slate-50 text-xs font-bold border-r border-slate-200 transition text-slate-600"
            >
              Hoy
            </button>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-slate-50 transition"
              title="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setViewType('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewType === 'month' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewType === 'week' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Semanal
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center text-xs font-bold text-slate-400 py-3.5">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="tracking-wider">{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-100">
          {gridDays.map((day, idx) => {
            const dayEvents = getDeliverablesForDate(day);
            const isCurrMonth = day.getMonth() === currentDate.getMonth();
            const isTodayDay = isToday(day);

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 bg-white flex flex-col justify-between transition-all duration-200 ${
                  !isCurrMonth && viewType === 'month' ? 'bg-slate-50/50 text-slate-400' : 'text-slate-700'
                } ${isTodayDay ? 'ring-2 ring-emerald-600/30 relative z-10' : ''}`}
              >
                {/* Day Number Header */}
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className={`text-[11px] font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                      isTodayDay 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : isCurrMonth ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50/60 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wide">
                      {dayEvents.length} {dayEvents.length === 1 ? 'Ev.' : 'Evs.'}
                    </span>
                  )}
                </div>

                {/* Day Deliverables list */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[72px] mt-1 pr-0.5">
                  {dayEvents.map((item) => {
                    const colors = getEventColors(item);
                    return (
                      <button
                        key={item.id_entregable}
                        onClick={(e) => handleEventClick(item, e)}
                        className={`w-full text-left text-[9px] font-extrabold p-1.5 border rounded-lg flex items-center gap-1.5 truncate transition ${colors.bg}`}
                        title={`${item.curso_codigo}: ${item.titulo}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                        <span className="font-bold text-slate-800">{item.curso_codigo}</span>
                        <span className="truncate text-slate-600">{item.titulo}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detail Dialog Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-box p-6 space-y-4 max-w-md text-left" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
              <div className="text-left">
                <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider">
                  {selectedEvent.curso_codigo} · Sec. {selectedEvent.curso_seccion}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-2.5">{selectedEvent.titulo}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedEvent.curso_nombre}</p>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Event Info */}
            <div className="space-y-3.5 border-y border-slate-100 py-4 text-xs text-slate-600 text-left">
              {selectedEvent.descripcion && (
                <div className="flex gap-2">
                  <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 border border-slate-100 rounded-xl w-full">{selectedEvent.descripcion}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span>Cierre: <strong className="text-slate-800 font-bold">{formatInLimaTimezone(selectedEvent.fecha_cierre_efectiva)}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-slate-400" />
                <span>
                  Estado: {' '}
                  <span className="font-bold text-slate-800">
                    {selectedEvent.estado_entrega === 'calificado' && 'Calificado'}
                    {selectedEvent.estado_entrega === 'entregado_a_tiempo' && 'Entregado a Tiempo'}
                    {selectedEvent.estado_entrega === 'entregado_tardio' && 'Entregado Tardío'}
                    {selectedEvent.estado_entrega === 'vencido' && 'Vencido / No Entregado'}
                    {selectedEvent.estado_entrega === 'pendiente' && 'Pendiente de Entrega'}
                  </span>
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </Button>
              
              {selectedEvent.entrega ? (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleVerConstanciaClick}
                  icon={<FileText size={14} />}
                >
                  Ver Constancia
                </Button>
              ) : (new Date(selectedEvent.fecha_cierre_efectiva) >= new Date() || selectedEvent.admite_extemporaneas) ? (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleUploadClick}
                >
                  Entregar Trabajo
                </Button>
              ) : (
                <Button 
                  variant="primary"
                  size="sm"
                  className="opacity-50 cursor-not-allowed" 
                  disabled
                >
                  Plazo Cerrado
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Child Modals */}
      <ModalEntrega
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        entregable={selectedEvent}
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

export default CronogramaAlumno;
