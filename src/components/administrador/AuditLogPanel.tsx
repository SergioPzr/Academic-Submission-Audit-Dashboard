import { useState, useCallback, useEffect } from 'react';
import { fetchLogs } from '../../lib/data-service';
import type { LogAuditoria } from '../../lib/types';
import { toLimaTimestamp } from '../../utils/limaTime';
import { exportToCSV } from '../../utils/csvExport';

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await fetchLogs({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      eventFilter: eventFilter || undefined,
    });
    setLogs(data);
    setLoading(false);
  }, [dateFrom, dateTo, eventFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    setExporting(true);
    const rows = logs.map((l) => ({
      ID: l.id, Usuario: l.user_id, Evento: l.event_type, Tabla: l.table_affected,
      'Valores Anteriores': l.old_values ? JSON.stringify(l.old_values) : '',
      'Valores Nuevos': l.new_values ? JSON.stringify(l.new_values) : '',
      IP: l.ip_address, Fecha: l.created_at,
    }));
    exportToCSV(rows, `audit-log-${Date.now()}`);
    setExporting(false);
  };

  const eventTypes = [...new Set(logs.map((l) => l.event_type))];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-text-1">Log de Auditoría Histórica</div>
          <div className="text-xs text-text-3 mt-0.5">Registro inmutable de eventos del sistema</div>
        </div>
        <button onClick={handleExport} disabled={exporting || logs.length === 0}
          className="px-3 py-1.5 rounded-lg border border-border-mid text-xs font-medium text-text-2 hover:bg-surface-2 transition-colors flex items-center gap-1.5 disabled:opacity-50">
          {exporting ? 'Exportando...' : '📥 Exportar CSV'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-border bg-surface-2">
          <div>
            <label className="block text-[10px] font-medium text-text-3 mb-0.5">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border text-xs outline-none focus:border-indigo" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-text-3 mb-0.5">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border text-xs outline-none focus:border-indigo" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-text-3 mb-0.5">Evento</label>
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border text-xs outline-none focus:border-indigo">
              <option value="">Todos</option>
              {eventTypes.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchData}
              className="px-3 py-1.5 rounded-md bg-indigo text-white text-xs font-medium hover:bg-indigo/90 transition-colors">🔍 Filtrar</button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-text-3">Cargando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-text-3">No existen registros para los parámetros seleccionados.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-surface-2 sticky top-0">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-text-3 uppercase">Evento</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-text-3 uppercase">Usuario</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-text-3 uppercase">Tabla</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-text-3 uppercase">IP</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-text-3 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-2 text-xs">
                    <td className="px-3 py-2"><span className="font-mono text-[10px] bg-surface-2 px-1.5 py-0.5 rounded">{log.event_type}</span></td>
                    <td className="px-3 py-2 text-text-2 font-mono text-[10px]">{log.user_id.slice(0, 8)}...</td>
                    <td className="px-3 py-2 text-text-2">{log.table_affected}</td>
                    <td className="px-3 py-2 text-text-3 font-mono text-[10px]">{log.ip_address}</td>
                    <td className="px-3 py-2 text-text-3 font-mono text-[10px]">{toLimaTimestamp(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
