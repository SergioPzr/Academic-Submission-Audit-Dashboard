import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import type { CursoConStats } from '../../services/cursosService';
import { formatInLimaTimezone } from '../../utils/dateUtils';
import { Calendar, Users, BarChart2, Activity } from 'lucide-react';

interface CursoCardProps {
  curso: CursoConStats;
}

const CursoCard: React.FC<CursoCardProps> = ({ curso }) => {
  const navigate = useNavigate();
  const { id_curso, codigo, nombre, seccion, total_alumnos, proximo_entregable, stats } = curso;

  // SVG Circular Progress calculation
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.pct_entregas / 100) * circumference;

  return (
    <Card className="hover-card flex flex-col justify-between h-full bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              {codigo} · Sec {seccion}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-2 line-clamp-1" title={nombre}>
              {nombre}
            </h3>
          </div>
          
          {/* Circular Progress */}
          <div className="relative flex items-center justify-center h-16 w-16 flex-shrink-0" title={`${stats.pct_entregas}% entregado`}>
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-gray-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="32"
                cy="32"
              />
              <circle
                className="text-emerald-500 transition-all duration-500 ease-out"
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="32"
                cy="32"
              />
            </svg>
            <span className="absolute text-xs font-bold text-gray-700">{Math.round(stats.pct_entregas)}%</span>
          </div>
        </div>

        {/* Matriculados count */}
        <div className="flex items-center text-sm text-gray-500 mb-5">
          <Users size={16} className="mr-1.5 text-gray-400" />
          <span>{total_alumnos} {total_alumnos === 1 ? 'estudiante matriculado' : 'estudiantes matriculados'}</span>
        </div>

        {/* Mini stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="text-center p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
            <p className="text-xs text-emerald-700 font-medium">A Tiempo</p>
            <p className="text-lg font-bold text-emerald-950 mt-0.5">{stats.a_tiempo}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
            <p className="text-xs text-amber-700 font-medium">Tardías</p>
            <p className="text-lg font-bold text-amber-950 mt-0.5">{stats.tardias}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50/50 border border-red-100/50">
            <p className="text-xs text-red-700 font-medium">Pendientes</p>
            <p className="text-lg font-bold text-red-950 mt-0.5">{stats.pendientes}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50/50 border border-purple-100/50">
            <p className="text-xs text-purple-700 font-medium">Calificad.</p>
            <p className="text-lg font-bold text-purple-950 mt-0.5">{stats.calificados}</p>
          </div>
        </div>

        {/* Double progress bars */}
        <div className="space-y-3 mb-5">
          {/* Submissions progress bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>Avance de entregas</span>
              <span>{Math.round(stats.pct_entregas)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct_entregas}%` }}
              />
            </div>
          </div>

          {/* Grading progress bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>Avance de calificación</span>
              <span>{Math.round(stats.pct_calificacion)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.pct_calificacion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Next Deliverable Info & Buttons */}
      <div className="border-t border-gray-100 pt-4 mt-auto">
        {proximo_entregable ? (
          <div className="mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100/80">
            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Calendar size={12} className="mr-1" />
              <span>Próximo entregable</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-1 line-clamp-1">
              {proximo_entregable.titulo}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Cierre: {formatInLimaTimezone(proximo_entregable.fecha_cierre, 'full')}
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 text-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            Sin entregables vigentes o programados
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (proximo_entregable) {
                sessionStorage.setItem('calificacion_curso_id', id_curso);
                sessionStorage.setItem('calificacion_entregable_id', proximo_entregable.id_entregable);
                navigate('/profesor/calificacion');
              } else {
                navigate('/profesor/calificacion');
              }
            }}
            className="flex-1 btn btn-ghost text-xs flex justify-center items-center py-2"
            disabled={!proximo_entregable}
            title={!proximo_entregable ? 'Cree un entregable primero para poder calificar' : 'Evaluar entregas de este curso'}
          >
            <BarChart2 size={14} className="mr-1.5" />
            Calificar
          </button>
          <button
            onClick={() => {
              if (proximo_entregable) {
                navigate(`/profesor/monitor?cursoId=${id_curso}&entregableId=${proximo_entregable.id_entregable}`);
              } else {
                navigate('/profesor/monitor');
              }
            }}
            className="flex-1 btn btn-primary text-xs flex justify-center items-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
          >
            <Activity size={14} className="mr-1.5" />
            Monitor
          </button>
        </div>
      </div>
    </Card>
  );
};

export default CursoCard;
