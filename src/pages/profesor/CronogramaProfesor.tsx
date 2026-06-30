import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getMisCursos } from '../../services/cursosService';
import type { CursoConStats } from '../../services/cursosService';
import { getEntregablesPorCurso } from '../../services/entregablesService';
import type { Entregable } from '../../services/entregablesService';
import ModalCrearEntregable from './ModalCrearEntregable';
import ModalProrrogaIndividual from './ModalProrrogaIndividual';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, Plus, Edit2, UserPlus, Eye, CalendarCheck, X } from 'lucide-react';

const isSameDayLima = (calendarDate: Date, utcDateString: string): boolean => {
  try {
    const date = new Date(utcDateString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
    const partMap = new Map(parts.map(p => [p.type, p.value]));
    const year = parseInt(partMap.get('year') || '0');
    const month = parseInt(partMap.get('month') || '0') - 1;
    const day = parseInt(partMap.get('day') || '0');
    
    return calendarDate.getFullYear() === year && calendarDate.getMonth() === month && calendarDate.getDate() === day;
  } catch (e) {
    return false;
  }
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
};

const generateCalendarDays = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  
  // Previous month padding
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }
  
  // Next month padding
  const remainingCells = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(nextYear, nextMonth, i),
      isCurrentMonth: false
    });
  }
  
  return days;
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CronogramaProfesor: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  // Selected Course
  const [cursoId, setCursoId] = useState<string>('');
  const [cursos, setCursos] = useState<CursoConStats[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [prorrogaModalOpen, setProrrogaModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedEntregable, setSelectedEntregable] = useState<Entregable | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  // Fetch courses first
  useEffect(() => {
    const fetchCursos = async () => {
      if (!perfil?.id) return;
      try {
        const list = await getMisCursos(perfil.id);
        setCursos(list);
        if (list.length > 0) {
          setCursoId(list[0].id_curso);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCursos();
  }, [perfil?.id]);

  // Fetch deliverables when courseId changes
  const loadEntregables = useCallback(async () => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const list = await getEntregablesPorCurso(cursoId);
      setEntregables(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => {
    loadEntregables();
  }, [loadEntregables]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get status class for deliverable
  const getDeliverableStatusInfo = (ent: Entregable) => {
    const now = new Date();
    const openDate = new Date(ent.fecha_apertura);
    const closeDate = new Date(ent.fecha_cierre);

    const isOpenNow = now >= openDate && now <= closeDate;
    
    let colorClass = '';
    let label = '';

    if (now > closeDate) {
      colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
      label = 'Cerrado';
    } else if (now < openDate) {
      colorClass = 'bg-blue-50 text-blue-850 border-blue-200';
      label = 'Futuro';
    } else {
      const diffMs = closeDate.getTime() - now.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      if (diffHrs < 24) {
        colorClass = 'bg-amber-50 text-amber-800 border-amber-300';
        label = 'Urgente (<24h)';
      } else {
        colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        label = 'Activo';
      }
    }

    return { colorClass, label, isOpenNow };
  };

  const handleDayClick = (dayDate: Date) => {
    setSelectedCalendarDate(dayDate);
    setCreateModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, ent: Entregable) => {
    e.stopPropagation();
    setSelectedEntregable(ent);
    setOptionsModalOpen(true);
  };

  const handleEditClick = () => {
    setOptionsModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleProrrogaClick = () => {
    setOptionsModalOpen(false);
    setProrrogaModalOpen(true);
  };

  const handleMonitorClick = () => {
    setOptionsModalOpen(false);
    if (selectedEntregable) {
      navigate(`/profesor/monitor?cursoId=${cursoId}&entregableId=${selectedEntregable.id_entregable}`);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDays = generateCalendarDays(year, month);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header and selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarCheck className="text-emerald-700" size={24} />
            <span>Cronograma del Profesor</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Crea, edita y visualiza entregables en tu calendario mensual.</p>
        </div>

        {/* Selector de Curso */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex flex-col w-full md:w-[240px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Filtrar por Curso</span>
            <select
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
            >
              {cursos.map(c => (
                <option key={c.id_curso} value={c.id_curso}>
                  {c.codigo} - {c.seccion} ({c.nombre})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Navigation Panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition"
          >
            <ChevronRight size={18} />
          </button>
          <h3 className="text-base font-bold text-slate-800 ml-2">
            {MESES[month]} {year}
          </h3>
        </div>

        <Button
          onClick={handleToday}
          variant="secondary"
          size="sm"
        >
          Hoy
        </Button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-3 bg-white rounded-2xl border border-slate-100">
          <Spinner size="lg" />
          <p className="text-xs text-slate-400 font-bold">Cargando cronograma...</p>
        </div>
      ) : (
        <Card className="overflow-hidden border border-slate-100 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-100">
            {calendarDays.map((day, idx) => {
              const dateStr = day.date.toDateString();
              const isToday = new Date().toDateString() === dateStr;
              
              const dayDeliverables = entregables.filter(ent =>
                isSameDayLima(day.date, ent.fecha_cierre)
              );

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day.date)}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition bg-white cursor-pointer group hover:bg-emerald-50/20 ${
                    day.isCurrentMonth ? '' : 'text-slate-350'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`h-6 w-6 flex items-center justify-center text-[11px] font-bold rounded-full ${
                        isToday
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-350'
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    <Plus size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 mr-1 transition" />
                  </div>

                  <div className="mt-2 space-y-1 overflow-y-auto flex-1 max-h-[75px] pr-0.5">
                    {dayDeliverables.map((ent) => {
                      const { colorClass, label, isOpenNow } = getDeliverableStatusInfo(ent);
                      return (
                        <div
                          key={ent.id_entregable}
                          onClick={(e) => handleEventClick(e, ent)}
                          className={`px-2 py-1 text-[9px] font-extrabold rounded-lg border truncate transition-all duration-200 hover:scale-[1.02] ${colorClass} ${
                            isOpenNow ? 'border-emerald-500 shadow-sm animate-pulse' : ''
                          }`}
                          title={`${ent.titulo} - Cierre: ${new Date(ent.fecha_cierre).toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })} (${label})`}
                        >
                          {ent.titulo}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-5 justify-center bg-slate-50/50 p-4 border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border bg-emerald-50 border-emerald-200"></div>
          <span>Ventana Activa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border bg-amber-50 border-amber-300"></div>
          <span>Urgente (Cierre &lt;24h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border bg-blue-50 border-blue-200"></div>
          <span>Ventana Futura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border bg-slate-50 border-slate-200"></div>
          <span>Ventana Cerrada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded-md border-2 border-emerald-500 bg-white animate-pulse shadow-sm"></div>
          <span>Abierto Ahora</span>
        </div>
      </div>

      {/* Event Details Options Modal */}
      {optionsModalOpen && selectedEntregable && (
        <div className="modal-overlay" onClick={() => setOptionsModalOpen(false)}>
          <div className="modal-box p-6 space-y-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 truncate pr-6 text-left">
                {selectedEntregable.titulo}
              </h3>
              <button
                onClick={() => setOptionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-500 text-left">
              {selectedEntregable.descripcion && (
                <p className="bg-slate-50 p-2.5 rounded-xl text-[11px] leading-relaxed text-slate-500 italic max-h-[80px] overflow-y-auto border border-slate-100">
                  {selectedEntregable.descripcion}
                </p>
              )}
              <p>
                <strong>Apertura:</strong> {formatInLimaTimezone(selectedEntregable.fecha_apertura, 'full')}
              </p>
              <p>
                <strong>Cierre:</strong> {formatInLimaTimezone(selectedEntregable.fecha_cierre, 'full')}
              </p>
              <p className="flex items-center gap-2">
                <strong>Extemporáneas:</strong>
                <Badge
                  variant={selectedEntregable.admite_extemporaneas ? 'success' : 'neutral'}
                  label={selectedEntregable.admite_extemporaneas ? 'Sí' : 'No'}
                />
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              <Button
                onClick={handleEditClick}
                variant="primary"
                size="sm"
                className="w-full"
                icon={<Edit2 size={14} />}
              >
                Editar Entregable
              </Button>
              
              <Button
                onClick={handleProrrogaClick}
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<UserPlus size={14} />}
              >
                Otorgar Prórroga
              </Button>

              <Button
                onClick={handleMonitorClick}
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Eye size={14} />}
              >
                Ver Monitor en Vivo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {cursoId && (
        <ModalCrearEntregable
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setSelectedEntregable(null);
            setSelectedCalendarDate(undefined);
          }}
          onSuccess={loadEntregables}
          idCurso={cursoId}
          entregableAEditar={selectedEntregable}
          defaultDate={selectedCalendarDate}
        />
      )}

      {/* Prórroga Modal */}
      {prorrogaModalOpen && selectedEntregable && cursoId && (
        <ModalProrrogaIndividual
          isOpen={prorrogaModalOpen}
          onClose={() => {
            setProrrogaModalOpen(false);
            setSelectedEntregable(null);
          }}
          onSuccess={loadEntregables}
          idCurso={cursoId}
          idEntregable={selectedEntregable.id_entregable}
          entregableTitulo={selectedEntregable.titulo}
          defaultFechaCierre={selectedEntregable.fecha_cierre}
        />
      )}
    </div>
  );
};

export default CronogramaProfesor;
