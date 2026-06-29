import { useState, useCallback, useEffect } from 'react';
import { useRealtime } from '../../hooks/useRealtime';
import type { Entrega, AlumnoInfo, EstadoFiltro } from '../../lib/types';
import { fetchEntregas, fetchStudents } from '../../lib/data-service';
import BadgeEstado from '../shared/BadgeEstado';
import ModalCalificar from './ModalCalificar';
import { toLimaTimestamp } from '../../utils/limaTime';
import { cn } from '../../utils/cn';

interface Props {
  cursoId: string;
  entregableId: string;
}

const DEFAULT_STUDENT: AlumnoInfo = {
  id: '??', full_name: 'Desconocido', email: '', initials: '??',
  avatar_color: '#94a3b8', avatar_bg: '#f1f5f9',
};

export default function MatrizEntregas({ cursoId, entregableId }: Props) {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [students, setStudents] = useState<Map<string, AlumnoInfo>>(new Map());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EstadoFiltro>('all');
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents().then((list) => {
      const map = new Map<string, AlumnoInfo>();
      list.forEach((s) => map.set(s.id, s));
      setStudents(map);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEntregas(cursoId, entregableId);
      setEntregas(data);
    } catch {
      console.warn('Error fetching entregas');
    }
    setLoading(false);
  }, [cursoId, entregableId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime<Entrega>({
    table: 'Entregas',
    filter: `id_curso=eq.${cursoId}`,
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        setEntregas((prev) => [payload.new as Entrega, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setEntregas((prev) =>
          prev.map((e) => (e.id === (payload.new as Entrega).id ? (payload.new as Entrega) : e))
        );
      }
    },
    enabled: true,
  });

  const getStudent = useCallback((id: string): AlumnoInfo => {
    return students.get(id) ?? DEFAULT_STUDENT;
  }, [students]);

  const filtered = entregas.filter((e) => {
    const st = getStudent(e.id_alumno);
    const matchSearch = !search || st.full_name.toLowerCase().includes(search.toLowerCase()) || st.email.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'atiempo') return e.estado_puntualidad === 'A Tiempo';
    if (filter === 'tardia') return e.estado_puntualidad === 'Tardía';
    if (filter === 'sinentregar') return !e.submitted_at;
    if (filter === 'calificado') return e.estado_calificacion === 'CALIFICADO';
    return true;
  });

  const handleCalificar = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setModalOpen(true);
  };

  const handleGradeSaved = () => {
    setModalOpen(false);
    setSelectedEntrega(null);
    fetchData();
  };

  const filters: { key: EstadoFiltro; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'atiempo', label: 'A Tiempo' },
    { key: 'tardia', label: 'Tardía' },
    { key: 'sinentregar', label: 'Sin entregar' },
    { key: 'calificado', label: 'Calificado' },
  ];

  return (
    <div>
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  filter === f.key
                    ? 'bg-indigo text-white border-indigo'
                    : 'bg-none text-text-2 border-border-mid hover:border-indigo'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alumno..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-surface-2 text-sm outline-none focus:border-indigo focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider w-[200px]">Alumno</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">Enlace Drive</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">Auditoría</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">Calificación</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-3 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-3">Cargando entregas...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-3">
                    <div className="text-3xl mb-2">📭</div>
                    No se encontraron alumnos con ese criterio.
                  </td>
                </tr>
              ) : (
                filtered.map((entrega) => {
                  const st = getStudent(entrega.id_alumno);
                  const submitted = !!entrega.submitted_at;

                  return (
                    <tr key={entrega.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: st.avatar_bg, color: st.avatar_color }}>
                            {st.initials}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-1">{st.full_name}</div>
                            <div className="text-[11px] text-text-3">{st.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {submitted ? (
                          <a href={entrega.drive_secure_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-light text-blue text-xs border border-blue-light hover:bg-blue-100 transition-colors">
                            🔗 Ver archivo
                          </a>
                        ) : <span className="text-xs text-text-3">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-text-2">
                          {submitted ? toLimaTimestamp(entrega.submitted_at) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <BadgeEstado
                          estado={!submitted ? 'Sin entregar' : entrega.estado_puntualidad === 'A Tiempo' ? 'A Tiempo' : 'Tardía'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {entrega.estado_calificacion === 'CALIFICADO' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-light text-blue text-xs font-semibold px-2.5 py-1 rounded-full font-mono">
                            {entrega.nota_num}<span className="text-[10px] font-normal text-blue-400">/20</span>
                          </span>
                        ) : submitted ? (
                          <span className="text-xs text-text-3">Pendiente</span>
                        ) : <span className="text-xs text-text-3">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {submitted && (
                          <button onClick={() => handleCalificar(entrega)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors',
                              entrega.estado_calificacion === 'CALIFICADO'
                                ? 'bg-blue-light border-blue-300 text-blue hover:bg-blue-100'
                                : 'bg-none border-border-mid text-text-2 hover:bg-indigo-light hover:border-indigo-mid hover:text-indigo'
                            )}>
                            {entrega.estado_calificacion === 'CALIFICADO' ? '✏️ Editar' : '⭐ Calificar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && selectedEntrega && (
        <ModalCalificar
          entrega={selectedEntrega}
          alumno={getStudent(selectedEntrega.id_alumno)}
          onClose={() => { setModalOpen(false); setSelectedEntrega(null); }}
          onSaved={handleGradeSaved}
        />
      )}
    </div>
  );
}
