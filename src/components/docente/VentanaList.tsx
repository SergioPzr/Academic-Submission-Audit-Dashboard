import { useState, useEffect, useCallback } from 'react';
import type { VentanaTiempo } from '../../lib/types';
import { fetchVentanas, deleteVentana, countEntregasByEntregable } from '../../lib/data-service';
import { toLimaTime } from '../../utils/limaTime';
import VentanaForm from './VentanaForm';
import ConfirmModal from '../shared/ConfirmModal';

interface Props {
  cursoId: string;
}

export default function VentanaList({ cursoId }: Props) {
  const [ventanas, setVentanas] = useState<VentanaTiempo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VentanaTiempo | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await fetchVentanas(cursoId);
    setVentanas(data);
    setLoading(false);
  }, [cursoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const count = await countEntregasByEntregable(deleteTarget.entregable_id);
    if (count > 0) {
      alert('No se puede eliminar la ventana porque ya existen entregas asociadas.');
      setDeleteTarget(null);
      return;
    }

    await deleteVentana(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  const editingVentana = ventanas.find((v) => v.id === editingId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-1">Ventanas de Entrega</h3>
        <button onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-indigo text-white rounded-lg text-xs font-medium hover:bg-indigo/90 transition-colors flex items-center gap-1.5">
          <span>✚</span> Nueva ventana
        </button>
      </div>

      {showCreate && (
        <VentanaForm cursoId={cursoId} onSaved={() => { setShowCreate(false); fetchData(); }} onCancel={() => setShowCreate(false)} />
      )}

      {editingVentana && (
        <VentanaForm cursoId={cursoId}
          initialData={{ id: editingVentana.id, titulo: editingVentana.titulo, descripcion: editingVentana.descripcion, fecha_apertura: editingVentana.fecha_apertura, fecha_cierre: editingVentana.fecha_cierre }}
          onSaved={() => { setEditingId(null); fetchData(); }} onCancel={() => setEditingId(null)} />
      )}

      {loading ? (
        <div className="text-center py-8 text-text-3">Cargando...</div>
      ) : ventanas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-border">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm font-medium text-text-2">Sin ventanas configuradas</div>
          <div className="text-xs text-text-3 mt-1">Crea tu primera ventana de entrega.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ventanas.map((v) => {
            const now = Date.now();
            const close = new Date(v.fecha_cierre).getTime();
            const isOpen = now >= new Date(v.fecha_apertura).getTime() && now <= close;
            const isPast = now > close;

            return (
              <div key={v.id} className="bg-white rounded-lg border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-1">{v.titulo}</div>
                  <div className="text-xs text-text-3 mt-0.5 line-clamp-1">{v.descripcion}</div>
                  <div className="flex gap-4 mt-2 text-[11px] text-text-3">
                    <span>🟢 Abre: {toLimaTime(v.fecha_apertura)}</span>
                    <span>🔴 Cierra: {toLimaTime(v.fecha_cierre)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isPast ? 'bg-red-light text-red' : isOpen ? 'bg-green-light text-green' : 'bg-amber-light text-amber'
                  }`}>
                    {isPast ? 'Cerrada' : isOpen ? 'Abierta' : 'Pendiente'}
                  </span>
                  <button onClick={() => setEditingId(v.id)}
                    className="px-2.5 py-1.5 rounded-md border border-border-mid text-xs text-text-2 hover:bg-surface-2 transition-colors">✏️</button>
                  <button onClick={() => setDeleteTarget(v)}
                    className="px-2.5 py-1.5 rounded-md border border-border-mid text-xs text-text-2 hover:bg-red-light hover:text-red hover:border-red-mid transition-colors">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Eliminar Ventana"
        message={`¿Estás seguro de eliminar "${deleteTarget?.titulo}"?`} variant="danger"
        confirmLabel="Eliminar" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
