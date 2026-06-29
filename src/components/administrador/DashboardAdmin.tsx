import { useState, useEffect } from 'react';
import { fetchAdminMetrics } from '../../lib/data-service';

export default function DashboardAdmin() {
  const [metrics, setMetrics] = useState({ totalUsuarios: 0, totalCursos: 0, totalEntregas: 0, storageUsed: '0 MB' });

  useEffect(() => {
    fetchAdminMetrics().then(setMetrics);
  }, []);

  const cards = [
    { label: 'Usuarios registrados', value: metrics.totalUsuarios, icon: '👥', color: '#4f46e5' },
    { label: 'Cursos activos', value: metrics.totalCursos, icon: '📚', color: '#16a34a' },
    { label: 'Entregas registradas', value: metrics.totalEntregas, icon: '📤', color: '#2563eb' },
    { label: 'Storage usado', value: metrics.storageUsed, icon: '💾', color: '#9333ea' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm font-semibold text-text-1">Métricas Globales</div>
        <div className="text-xs text-text-3 mt-0.5">Volumen de transacciones e incidencias del sistema</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: card.color }} />
            </div>
            <div className="text-2xl font-bold text-text-1">{card.value}</div>
            <div className="text-xs text-text-3 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
