import { useState, useEffect } from 'react';
import { assignExtension, fetchStudents } from '../../lib/data-service';
import type { AlumnoInfo } from '../../lib/types';

interface Props {
  entregableId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalProrroga({ entregableId, onClose, onSaved }: Props) {
  const [students, setStudents] = useState<AlumnoInfo[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents().then(setStudents).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedAlumno) { setError('Selecciona un alumno.'); return; }
    if (!nuevaFecha) { setError('Ingresa la nueva fecha de cierre.'); return; }
    if (new Date(nuevaFecha) <= new Date()) {
      setError('La nueva fecha debe ser posterior a la hora actual.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await assignExtension({
        id_alumno: selectedAlumno,
        id_entregable: entregableId,
        nueva_fecha_cierre: new Date(nuevaFecha).toISOString(),
      });
    } catch {
      setError('Error al asignar la prórroga.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lg p-5 animate-[modalIn_0.2s_ease]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-1">Asignar Prórroga</h2>
            <p className="text-xs text-text-3 mt-0.5">Extiende el plazo para un alumno específico</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 text-sm">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Alumno</label>
            <select value={selectedAlumno} onChange={(e) => { setSelectedAlumno(e.target.value); setError(null); }}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors">
              <option value="">Seleccionar alumno...</option>
              {students.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name} — {a.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">Nueva fecha de cierre</label>
            <input type="datetime-local" value={nuevaFecha} onChange={(e) => { setNuevaFecha(e.target.value); setError(null); }}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>

          {error && <div className="text-xs text-red flex items-center gap-1.5">⚠️ {error}</div>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-2.5 bg-indigo text-white rounded-lg text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <span className="animate-pulse">Guardando...</span> : <>✅ Asignar Prórroga</>}
          </button>
        </div>
      </div>
    </div>
  );
}
