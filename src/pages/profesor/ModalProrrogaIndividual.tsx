import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { asignarProrroga, getAlumnosPorCurso } from '../../services/entregablesService';
import type { AlumnoMatriculado } from '../../services/entregablesService';

interface ModalProrrogaIndividualProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idCurso: string;
  idEntregable: string;
  entregableTitulo: string;
  defaultFechaCierre: string;
}

const toLimaDateTimeString = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
    const partMap = new Map(parts.map(p => [p.type, p.value]));
    
    const year = partMap.get('year') || '0000';
    const month = partMap.get('month') || '00';
    const day = partMap.get('day') || '00';
    const hour = partMap.get('hour') || '00';
    const minute = partMap.get('minute') || '00';
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (e) {
    console.error(e);
    return '';
  }
};

const fromLimaDateTimeStringToISO = (limaString: string): string => {
  if (!limaString) return '';
  const parsedDate = new Date(`${limaString}:00-05:00`);
  return parsedDate.toISOString();
};

const ModalProrrogaIndividual: React.FC<ModalProrrogaIndividualProps> = ({
  isOpen,
  onClose,
  onSuccess,
  idCurso,
  idEntregable,
  entregableTitulo,
  defaultFechaCierre,
}) => {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState<AlumnoMatriculado[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoMatriculado | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedAlumno(null);
      setError(null);
      
      if (defaultFechaCierre) {
        const originalDate = new Date(defaultFechaCierre);
        const extendedDate = new Date(originalDate);
        extendedDate.setDate(extendedDate.getDate() + 3);
        setNuevaFecha(toLimaDateTimeString(extendedDate.toISOString()));
      }

      const loadStudents = async () => {
        setLoadingAlumnos(true);
        try {
          const list = await getAlumnosPorCurso(idCurso);
          setAlumnos(list);
        } catch (err) {
          console.error('Error fetching students:', err);
          setError('No se pudo cargar la lista de alumnos.');
        } finally {
          setLoadingAlumnos(false);
        }
      };

      loadStudents();
    }
  }, [isOpen, idCurso, defaultFechaCierre]);

  if (!isOpen) return null;

  const filteredAlumnos = alumnos.filter(
    (a) =>
      a.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      (a.codigo_institucional && a.codigo_institucional.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlumno) {
      setError('Debe seleccionar un alumno');
      return;
    }
    if (!nuevaFecha) {
      setError('Debe especificar la nueva fecha de cierre');
      return;
    }
    if (!user?.id) {
      setError('Sesión inválida');
      return;
    }

    const isoNuevaFecha = fromLimaDateTimeStringToISO(nuevaFecha);

    if (new Date(isoNuevaFecha) <= new Date(defaultFechaCierre)) {
      setError('La nueva fecha de cierre debe ser posterior a la fecha de cierre original');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await asignarProrroga({
        id_entregable: idEntregable,
        id_alumno: selectedAlumno.id,
        nueva_fecha_cierre: isoNuevaFecha,
        otorgado_por: user.id,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ocurrió un error al asignar la prórroga');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-primary-dark">
            Otorgar Prórroga
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-700">
          <p><strong>Entregable:</strong> {entregableTitulo}</p>
          <p className="mt-1">
            <strong>Cierre original:</strong> {new Date(defaultFechaCierre).toLocaleString('es-PE', { timeZone: 'America/Lima' })} (Lima)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Seleccionar Alumno</label>
            
            {selectedAlumno ? (
              <div className="flex justify-between items-center p-3 border rounded bg-emerald-50 border-emerald-200">
                <div>
                  <p className="font-semibold text-emerald-900">{selectedAlumno.nombre_completo}</p>
                  <p className="text-xs text-emerald-700">{selectedAlumno.codigo_institucional || 'Sin código'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAlumno(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-sm font-bold"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                  placeholder="Buscar alumno por nombre o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loadingAlumnos || submitting}
                />
                
                {loadingAlumnos ? (
                  <div className="flex items-center justify-center p-4">
                    <Spinner size="sm" />
                    <span className="ml-2 text-sm text-gray-500">Cargando alumnos...</span>
                  </div>
                ) : (
                  <div className="border rounded max-h-[150px] overflow-y-auto bg-white shadow-inner divide-y">
                    {filteredAlumnos.length > 0 ? (
                      filteredAlumnos.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAlumno(a)}
                          className="p-2 text-sm hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <p className="font-medium text-gray-800">{a.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{a.codigo_institucional || a.email}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-gray-400">
                        {alumnos.length === 0 ? 'No hay alumnos matriculados' : 'No se encontraron coincidencias'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            type="datetime-local"
            label="Nueva fecha de cierre (Lima)"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            required
            disabled={submitting}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!selectedAlumno}
            >
              Asignar Prórroga
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalProrrogaIndividual;
