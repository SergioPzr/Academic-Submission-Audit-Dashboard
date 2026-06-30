import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { crearEntregable, editarEntregable } from '../../services/entregablesService';
import type { Entregable } from '../../services/entregablesService';

interface CourseOption {
  id_curso: string;
  nombre: string;
  codigo: string;
  seccion: string;
}

interface ModalCrearEntregableProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idCurso?: string; // Optional if selecting inside modal
  cursosList?: CourseOption[]; // List of courses to select from if no idCurso is fixed
  entregableAEditar?: Entregable | null;
  defaultDate?: Date; // For Calendar click
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
    console.error('Error formatting to Lima datetime-local string:', e);
    return '';
  }
};

const fromLimaDateTimeStringToISO = (limaString: string): string => {
  if (!limaString) return '';
  const parsedDate = new Date(`${limaString}:00-05:00`);
  return parsedDate.toISOString();
};

const ModalCrearEntregable: React.FC<ModalCrearEntregableProps> = ({
  isOpen,
  onClose,
  onSuccess,
  idCurso,
  cursosList = [],
  entregableAEditar = null,
  defaultDate,
}) => {
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [admiteExtemporaneas, setAdmiteExtemporaneas] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (entregableAEditar) {
        setCursoSeleccionado(entregableAEditar.id_curso);
        setTitulo(entregableAEditar.titulo);
        setDescripcion(entregableAEditar.descripcion || '');
        setFechaApertura(toLimaDateTimeString(entregableAEditar.fecha_apertura));
        setFechaCierre(toLimaDateTimeString(entregableAEditar.fecha_cierre));
        setAdmiteExtemporaneas(entregableAEditar.admite_extemporaneas);
      } else {
        setTitulo('');
        setDescripcion('');
        setCursoSeleccionado(idCurso || (cursosList.length > 0 ? cursosList[0].id_curso : ''));
        
        let start = new Date();
        if (defaultDate) {
          start = new Date(defaultDate);
          start.setHours(8, 0, 0, 0);
        }
        
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 0, 0);
        
        setFechaApertura(toLimaDateTimeString(start.toISOString()));
        setFechaCierre(toLimaDateTimeString(end.toISOString()));
        setAdmiteExtemporaneas(false);
      }
    }
  }, [isOpen, entregableAEditar, idCurso, defaultDate, cursosList]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCursoId = idCurso || cursoSeleccionado;
    
    if (!finalCursoId) {
      setError('Debe seleccionar un curso');
      return;
    }
    if (!titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!fechaApertura || !fechaCierre) {
      setError('Las fechas son requeridas');
      return;
    }

    const isoApertura = fromLimaDateTimeStringToISO(fechaApertura);
    const isoCierre = fromLimaDateTimeStringToISO(fechaCierre);

    if (new Date(isoCierre) <= new Date(isoApertura)) {
      setError('La fecha de cierre debe ser posterior a la fecha de apertura');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (entregableAEditar) {
        await editarEntregable(entregableAEditar.id_entregable, {
          titulo,
          descripcion,
          fecha_apertura: isoApertura,
          fecha_cierre: isoCierre,
          admite_extemporaneas: admiteExtemporaneas,
        });
      } else {
        await crearEntregable({
          id_curso: finalCursoId,
          titulo,
          descripcion,
          fecha_apertura: isoApertura,
          fecha_cierre: isoCierre,
          admite_extemporaneas: admiteExtemporaneas,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ocurrió un error al guardar el entregable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-primary-dark">
            {entregableAEditar ? 'Editar Entregable' : 'Crear Entregable'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selector */}
          {!idCurso && !entregableAEditar && cursosList.length > 0 && (
            <div className="flex flex-col w-full text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Curso</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                value={cursoSeleccionado}
                onChange={(e) => setCursoSeleccionado(e.target.value)}
                disabled={loading}
                required
              >
                {cursosList.map((c) => (
                  <option key={c.id_curso} value={c.id_curso}>
                    {c.codigo} - {c.nombre} (Sec. {c.seccion})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Título del entregable"
            placeholder="Ej. Tarea Académica 1 (TA1)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            disabled={loading}
          />

          <div className="flex flex-col w-full text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Descripción / Instrucciones
            </label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 min-h-[80px] resize-y"
              placeholder="Indique detalles o pautas para el alumno..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Fecha de apertura (Lima)"
              value={fechaApertura}
              onChange={(e) => setFechaApertura(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              type="datetime-local"
              label="Fecha de cierre (Lima)"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="admiteExtemporaneas"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={admiteExtemporaneas}
              onChange={(e) => setAdmiteExtemporaneas(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="admiteExtemporaneas" className="text-sm font-medium text-gray-700 select-none">
              Admitir entregas extemporáneas (Tardías)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              {entregableAEditar ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCrearEntregable;
