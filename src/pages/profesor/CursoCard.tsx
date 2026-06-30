import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import type { CursoConStats } from '../../services/cursosService';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import { Calendar, Users, BarChart2, Activity } from 'lucide-react';
import Button from '../../components/ui/Button';

interface CursoCardProps {
  curso: CursoConStats;
}

const CursoCard: React.FC<CursoCardProps> = ({ curso }) => {
  const navigate = useNavigate();
  const { id_curso, codigo, nombre, seccion, total_alumnos, proximo_entregable, stats } = curso;

  // SVG Circular Progress calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.pct_entregas / 100) * circumference;

  return (
    <Card className="flex flex-col justify-between h-full bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 text-left">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              {codigo} · Sec {seccion}
            </span>
            <h3 className="text-base font-bold text-slate-800 mt-3 line-clamp-1" title={nombre}>
              {nombre}
            </h3>
          </div>
          
          {/* Circular Progress */}
          <div className="relative flex items-center justify-center h-14 w-14 shrink-0" title={`${stats.pct_entregas}% entregado`}>
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="28"
                cy="28"
              />
              <circle
                className="text-emerald-600 transition-all duration-500 ease-out"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="28"
                cy="28"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-slate-700">{Math.round(stats.pct_entregas)}%</span>
          </div>
        </div>

        {/* Matriculados count */}
        <div className="flex items-center text-xs text-slate-400 font-semibold mb-4">
          <Users size={14} className="mr-1.5 text-slate-300" />
          <span>{total_alumnos} {total_alumnos === 1 ? 'estudiante' : 'estudiantes'}</span>
        </div>

        {/* Mini stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
            <p className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">A Tiempo</p>
            <p className="text-sm font-extrabold text-emerald-950 mt-0.5">{stats.a_tiempo}</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-100/50">
            <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Tardías</p>
            <p className="text-sm font-extrabold text-amber-950 mt-0.5">{stats.tardias}</p>
          </div>
          <div className="p-2 rounded-xl bg-red-50/50 border border-red-100/50">
            <p className="text-[9px] text-red-700 font-bold uppercase tracking-wider">Pend.</p>
            <p className="text-sm font-extrabold text-red-950 mt-0.5">{stats.pendientes}</p>
          </div>
          <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100/50">
            <p className="text-[9px] text-purple-700 font-bold uppercase tracking-wider">Calif.</p>
            <p className="text-sm font-extrabold text-purple-950 mt-0.5">{stats.calificados}</p>
          </div>
        </div>

        {/* Double progress bars */}
        <div className="space-y-3 mb-5">
          {/* Submissions progress bar */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Avance de entregas</span>
              <span>{Math.round(stats.pct_entregas)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct_entregas}%` }}
              />
            </div>
          </div>

          {/* Grading progress bar */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Avance de calificación</span>
              <span>{Math.round(stats.pct_calificacion)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct_calificacion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Next Deliverable Info & Buttons */}
      <div className="border-t border-slate-100 pt-4 mt-auto">
        {proximo_entregable ? (
          <div className="mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-left">
            <div className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <Calendar size={12} className="mr-1 text-slate-300" />
              <span>Próximo entregable</span>
            </div>
            <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">
              {proximo_entregable.titulo}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Cierre: {formatInLimaTimezone(proximo_entregable.fecha_cierre, 'full')}
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 text-center text-[10px] text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-semibold">
            Sin entregables vigentes o programados
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (proximo_entregable) {
                sessionStorage.setItem('calificacion_curso_id', id_curso);
                sessionStorage.setItem('calificacion_entregable_id', proximo_entregable.id_entregable);
                navigate('/profesor/calificacion');
              } else {
                navigate('/profesor/calificacion');
              }
            }}
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={!proximo_entregable}
            icon={<BarChart2 size={14} />}
            title={!proximo_entregable ? 'Cree un entregable primero' : 'Evaluar entregas'}
          >
            Calificar
          </Button>
          <Button
            onClick={() => {
              if (proximo_entregable) {
                navigate(`/profesor/monitor?cursoId=${id_curso}&entregableId=${proximo_entregable.id_entregable}`);
              } else {
                navigate('/profesor/monitor');
              }
            }}
            variant="primary"
            size="sm"
            className="flex-1"
            icon={<Activity size={14} />}
          >
            Monitor
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CursoCard;
