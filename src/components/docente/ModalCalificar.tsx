import { useState } from 'react';
import type { Entrega, AlumnoInfo } from '../../lib/types';
import { updateEntregaGrade } from '../../lib/data-service';
import { validateGrade } from '../../utils/validators';
import { toLimaTimestamp } from '../../utils/limaTime';

interface Props {
  entrega: Entrega;
  alumno: AlumnoInfo;
  onClose: () => void;
  onSaved: () => void;
}

export default function ModalCalificar({ entrega, alumno, onClose, onSaved }: Props) {
  const [grade, setGrade] = useState<number | null>(entrega.nota_num);
  const [feedback, setFeedback] = useState(entrega.retroalimentacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const gradeError = validateGrade(grade ?? NaN);
    if (gradeError) { setError(gradeError); return; }
    setError(null);
    setSaving(true);

    try {
      await updateEntregaGrade(entrega.id, grade!, feedback);
    } catch {
      setError('Error al guardar la calificación.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lg animate-[modalIn_0.2s_ease] overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div>
            <h2 className="text-base font-semibold text-text-1">Calificar Entrega</h2>
            <p className="text-xs text-text-3 mt-0.5">{alumno.full_name}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-2 hover:bg-surface-2 text-sm shrink-0">✕</button>
        </div>

        <div className="p-5">
          <div className="bg-surface-2 rounded-lg p-3.5 mb-4">
            <a href={entrega.drive_secure_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-light text-blue text-xs font-medium hover:bg-blue-100 transition-colors mb-2">
              🔗 Ver entrega en Drive
            </a>
            <div className="text-[11px] text-text-3 mt-1.5">
              Entregado: {toLimaTimestamp(entrega.submitted_at)}
            </div>
          </div>

          <label className="block text-center text-xs font-medium text-text-2 mb-2">Nota (sobre 20)</label>
          <input type="number" min={0} max={20} step={0.5} value={grade ?? ''}
            onChange={(e) => { setGrade(e.target.value ? parseFloat(e.target.value) : null); setError(null); }}
            placeholder="—"
            className="block w-28 mx-auto text-center text-3xl font-mono font-semibold py-2 border-2 border-border-mid rounded-lg outline-none focus:border-indigo transition-colors" />
          <p className="text-center text-xs text-text-3 mt-1 mb-4">/ 20 puntos</p>

          <div className="mb-4">
            <label className="block text-xs font-medium text-text-2 mb-1.5">Retroalimentación</label>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escribe un comentario constructivo..." rows={3}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors resize-none" />
          </div>

          {error && <div className="text-xs text-red mb-3 flex items-center gap-1.5">⚠️ {error}</div>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-indigo text-white rounded-lg text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <span className="animate-pulse">Guardando...</span> : <><span>✅</span> Guardar Calificación</>}
          </button>
        </div>
      </div>
    </div>
  );
}
