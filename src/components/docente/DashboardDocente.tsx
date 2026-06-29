import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import MatrizEntregas from './MatrizEntregas';
import EstadisticasPanel from './EstadisticasPanel';
import ExportarReporte from './ExportarReporte';
import VentanaList from './VentanaList';
import ModalProrroga from './ModalProrroga';

interface CursoInfo {
  id: string;
  nombre: string;
  entregableId: string;
  totalAlumnos: number;
}

export default function DashboardDocente() {
  const [cursos, setCursos] = useState<CursoInfo[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<CursoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProrroga, setShowProrroga] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase
      .from('Cursos_Secciones')
      .select('id, nombre, entregable_id, total_alumnos')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped = data.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            nombre: c.nombre as string,
            entregableId: c.entregable_id as string,
            totalAlumnos: (c.total_alumnos as number) || 0,
          }));
          setCursos(mapped);
          setCursoSeleccionado(mapped[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-text-3">Cargando cursos...</div>;
  }

  if (!cursoSeleccionado) {
    return <div className="text-center py-12 text-text-3">No hay cursos asignados.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm font-semibold text-text-1">Matriz de Seguimiento</div>
          <div className="text-xs text-text-3 mt-0.5">
            Mostrando entregas: {cursoSeleccionado.nombre}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cursos.length > 1 && (
            <select
              value={cursoSeleccionado.id}
              onChange={(e) => {
                const c = cursos.find((x) => x.id === e.target.value);
                if (c) setCursoSeleccionado(c);
              }}
              className="px-3 py-1.5 rounded-lg border border-border-mid text-xs font-medium text-text-2 bg-white outline-none"
            >
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowProrroga(true)}
            className="px-3 py-1.5 rounded-lg border border-border-mid text-xs font-medium text-text-2 hover:bg-surface-2 transition-colors flex items-center gap-1.5"
          >
            ⏰ Asignar Prórroga
          </button>
          <ExportarReporte
            cursoId={cursoSeleccionado.id}
            entregableId={cursoSeleccionado.entregableId}
            cursoNombre={cursoSeleccionado.nombre}
          />
        </div>
      </div>

      <EstadisticasPanel
        cursoId={cursoSeleccionado.id}
        entregableId={cursoSeleccionado.entregableId}
        totalAlumnos={cursoSeleccionado.totalAlumnos}
      />

      <MatrizEntregas
        key={refreshKey}
        cursoId={cursoSeleccionado.id}
        entregableId={cursoSeleccionado.entregableId}
      />

      <div className="mt-8">
        <VentanaList cursoId={cursoSeleccionado.id} />
      </div>

      {showProrroga && (
        <ModalProrroga
          entregableId={cursoSeleccionado.entregableId}
          onClose={() => setShowProrroga(false)}
          onSaved={() => {
            setShowProrroga(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
