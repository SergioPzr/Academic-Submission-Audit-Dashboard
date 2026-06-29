import { useState, useEffect, useCallback } from 'react';
import { fetchEntregas } from '../../lib/data-service';
import type { Entrega } from '../../lib/types';

interface Stats {
  total: number; aTiempo: number; tardia: number; sinEntregar: number; calificado: number; promedio: number;
}

interface Props {
  cursoId: string;
  entregableId: string;
  totalAlumnos: number;
}

export default function EstadisticasPanel({ cursoId, entregableId, totalAlumnos }: Props) {
  const [stats, setStats] = useState<Stats>({ total: 0, aTiempo: 0, tardia: 0, sinEntregar: 0, calificado: 0, promedio: 0 });

  const calculateStats = useCallback(async () => {
    const entregas = await fetchEntregas(cursoId, entregableId);
    const aTiempo = entregas.filter((e) => e.estado_puntualidad === 'A Tiempo').length;
    const tardia = entregas.filter((e) => e.estado_puntualidad === 'Tardía').length;
    const sinEntregar = totalAlumnos - entregas.filter((e) => !!e.submitted_at).length;
    const calificado = entregas.filter((e) => e.estado_calificacion === 'CALIFICADO').length;
    const notas = entregas.filter((e) => e.nota_num !== null).map((e) => e.nota_num as number);
    const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    setStats({ total: entregas.length, aTiempo, tardia, sinEntregar, calificado, promedio });
  }, [cursoId, entregableId, totalAlumnos]);

  useEffect(() => { calculateStats(); }, [calculateStats]);

  const cards = [
    { label: 'Total alumnos', value: totalAlumnos, color: '#4f46e5' },
    { label: 'A Tiempo', value: stats.aTiempo, color: '#16a34a' },
    { label: 'Tardía', value: stats.tardia, color: '#d97706' },
    { label: 'Sin entregar', value: stats.sinEntregar, color: '#94a3b8' },
    { label: 'Calificados', value: stats.calificado, color: '#2563eb' },
    { label: 'Promedio', value: stats.promedio.toFixed(1), color: '#9333ea' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: card.color }} />
            <span className="text-[10px] font-medium text-text-3 uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="text-xl font-semibold text-text-1">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
