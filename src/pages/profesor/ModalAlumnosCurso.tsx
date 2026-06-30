import React, { useEffect, useState } from 'react';
import { X, Users, Search, GraduationCap } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { getAlumnosCurso, type AlumnoCurso } from '../../services/cursosService';

interface ModalAlumnosCursoProps {
  isOpen: boolean;
  onClose: () => void;
  idCurso: string;
  cursoNombre: string;
  cursoCodigo: string;
  cursoSeccion: string;
}

const ModalAlumnosCurso: React.FC<ModalAlumnosCursoProps> = ({
  isOpen,
  onClose,
  idCurso,
  cursoNombre,
  cursoCodigo,
  cursoSeccion,
}) => {
  const [alumnos, setAlumnos] = useState<AlumnoCurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !idCurso) return;
    
    const fetchAlumnos = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getAlumnosCurso(idCurso);
        setAlumnos(list);
      } catch (err: any) {
        console.error('Error fetching course students:', err);
        setError('Error al obtener la lista de alumnos matriculados.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlumnos();
  }, [isOpen, idCurso]);

  if (!isOpen) return null;

  const alumnosFiltrados = alumnos.filter(
    (a) =>
      a.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      (a.codigo_institucional || '').toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-box max-w-xl overflow-hidden border-t-8 border-emerald-500 text-left" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Alumnos Matriculados</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {cursoNombre} · <span className="font-semibold text-slate-650">{cursoCodigo} (Sec {cursoSeccion})</span>
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o correo..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-450 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-250"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner size="md" />
              <span className="text-xs text-slate-400 font-bold">Cargando alumnos matriculados...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alumnosFiltrados.length === 0 ? (
                <div className="text-center py-10 text-xs font-semibold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  {search ? 'No se encontraron alumnos coincidentes.' : 'No hay alumnos matriculados en este curso.'}
                </div>
              ) : (
                alumnosFiltrados.map((a) => (
                  <div 
                    key={a.id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="space-y-1 text-left">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <GraduationCap size={14} className="text-slate-400" />
                        <span>{a.nombre_completo}</span>
                      </p>
                      <p className="text-[10px] text-slate-450 font-medium">{a.email}</p>
                      {a.facultad && (
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{a.facultad}</p>
                      )}
                    </div>
                    {a.codigo_institucional && (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg font-mono">
                        {a.codigo_institucional}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalAlumnosCurso;
