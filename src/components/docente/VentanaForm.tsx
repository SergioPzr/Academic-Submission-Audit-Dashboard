import { useState } from 'react';
import { createOrUpdateVentana } from '../../lib/data-service';
import { validateVentanaDates, validateRequired } from '../../utils/validators';
import { toLimaISO } from '../../utils/limaTime';

interface Props {
  cursoId: string;
  onSaved: () => void;
  onCancel?: () => void;
  initialData?: {
    id: string;
    titulo: string;
    descripcion: string;
    fecha_apertura: string;
    fecha_cierre: string;
  };
}

export default function VentanaForm({ cursoId, onSaved, onCancel, initialData }: Props) {
  const isEdit = !!initialData;
  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '');
  const [fechaApertura, setFechaApertura] = useState(
    initialData?.fecha_apertura ? toLimaISO(new Date(initialData.fecha_apertura)) : ''
  );
  const [fechaCierre, setFechaCierre] = useState(
    initialData?.fecha_cierre ? toLimaISO(new Date(initialData.fecha_cierre)) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const titleErr = validateRequired(titulo, 'El título');
    if (titleErr) { setError(titleErr); return; }

    const dateErr = validateVentanaDates(fechaApertura, fechaCierre);
    if (dateErr) { setError(dateErr); return; }

    if (new Date(fechaCierre) <= new Date()) {
      setError('No se puede establecer una fecha de cierre anterior a la hora actual.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await createOrUpdateVentana({
        action: isEdit ? 'UPDATE' : 'CREATE',
        curso_id: cursoId,
        entregable_id: initialData?.id ?? crypto.randomUUID(),
        titulo,
        descripcion,
        fecha_apertura: new Date(fechaApertura).toISOString(),
        fecha_cierre: new Date(fechaCierre).toISOString(),
      });
    } catch {
      setError('Error al guardar la ventana.');
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-6">
      <h3 className="text-sm font-semibold text-text-1 mb-4 flex items-center gap-2">
        <span className="text-lg">✏️</span>
        {isEdit ? 'Editar Ventana de Entrega' : 'Crear Nueva Asignación'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Título *</label>
          <input type="text" value={titulo} onChange={(e) => { setTitulo(e.target.value); setError(null); }}
            placeholder="Ej: Proyecto Final de Estadística"
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-2 mb-1.5">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
            placeholder="Describe qué deben entregar los alumnos..."
            className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">📅 Apertura *</label>
            <input type="datetime-local" value={fechaApertura}
              onChange={(e) => { setFechaApertura(e.target.value); setError(null); }}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1.5">🔒 Cierre *</label>
            <input type="datetime-local" value={fechaCierre}
              onChange={(e) => { setFechaCierre(e.target.value); setError(null); }}
              className="w-full px-3 py-2 border border-border-mid rounded-lg text-sm outline-none focus:border-indigo transition-colors" />
          </div>
        </div>

        {error && <div className="text-xs text-red flex items-center gap-1.5">⚠️ {error}</div>}

        <div className="flex gap-2.5 justify-end pt-2">
          {onCancel && (
            <button onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-border-mid text-text-2 text-sm font-medium hover:bg-surface-2 transition-colors">Cancelar</button>
          )}
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo text-white text-sm font-medium hover:bg-indigo/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving ? <span className="animate-pulse">Guardando...</span> : <>{isEdit ? '💾 Actualizar' : '✚ Publicar'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
