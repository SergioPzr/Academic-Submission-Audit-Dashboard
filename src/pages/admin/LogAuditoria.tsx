import React, { useEffect, useState, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, AlertTriangle, Info, Eye } from 'lucide-react';
import { getLogsAuditoria, type LogAuditoria as LogType, type FiltrosAuditoria as FiltrosType } from '../../services/auditService';
import FiltrosAuditoria from './FiltrosAuditoria';
import OperacionBadge from './OperacionBadge';
import ExportarAuditoria from './ExportarAuditoria';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const LogAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<LogType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [filtros, setFiltros] = useState<FiltrosType>({
    fechaDesde: '',
    fechaHasta: '',
    emailUsuario: '',
    tipoOperacion: 'Todas',
  });

  const [page, setPage] = useState(1);
  const limit = 50;

  const [selectedJson, setSelectedJson] = useState<{ title: string; data: any } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLogsAuditoria(filtros, page, limit);
      setLogs(result.data);
      setTotal(result.total);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Error al obtener los registros del log de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filtros, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilters = (newFilters: FiltrosType) => {
    setFiltros(newFilters);
    setPage(1);
  };

  const handleShowMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {message && (
        <div 
          className="p-4 border rounded-xl flex items-center gap-2 text-xs font-semibold"
          style={{
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderColor: message.type === 'success' ? '#A7F3D0' : '#FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
          }}
        >
          <Info size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield size={24} className="text-emerald-700" />
            <span>Log de Auditoría Global</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Trazabilidad profunda · cumple RF-21 y exportable bajo demanda
          </p>
        </div>
        
        <ExportarAuditoria
          filtros={filtros}
          totalLogs={total}
          onShowMessage={handleShowMessage}
        />
      </div>

      {/* Filters */}
      <FiltrosAuditoria 
        onApplyFilters={handleApplyFilters} 
        loading={loading} 
      />

      {/* Stats Bar */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
        <p>
          Mostrando {logs.length} de {total} eventos · ordenado desc por timestamp
        </p>
        <Badge label="Retención: 7 años (RF-21)" variant="neutral" />
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle size={16} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <Card className="overflow-hidden border border-slate-100">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Operación</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">Tabla</th>
                  <th className="px-6 py-3.5 text-left font-bold text-slate-400 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3.5 text-center font-bold text-slate-400 uppercase tracking-wider">Valor Ant.</th>
                  <th className="px-6 py-3.5 text-center font-bold text-slate-400 uppercase tracking-wider">Valor Nuev.</th>
                  <th className="px-6 py-3.5 text-center font-bold text-slate-400 uppercase tracking-wider">Metadata</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-semibold">
                      No existen registros para los parámetros seleccionados
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const date = new Date(log.timestamp_servidor);
                    const formattedDate = date.toLocaleString('es-PE', { timeZone: 'America/Lima' });

                    return (
                      <tr key={log.id_log} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-600 font-mono">{formattedDate}</td>
                        <td className="px-6 py-4 text-left font-semibold text-slate-700 max-w-[200px] truncate" title={log.email_usuario || ''}>
                          {log.email_usuario || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <OperacionBadge tipo={log.tipo_operacion} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          {log.tabla_afectada ? (
                            <code className="text-[10px] font-bold font-mono bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {log.tabla_afectada}
                            </code>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500 font-mono">{log.ip_cliente || '—'}</td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {log.valor_anterior ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Valor Anterior', data: log.valor_anterior })}
                              className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition"
                              title="Ver valor anterior"
                            >
                              <Eye size={16} />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {log.valor_nuevo ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Valor Nuevo', data: log.valor_nuevo })}
                              className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition"
                              title="Ver valor nuevo"
                            >
                              <Eye size={16} />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {log.metadata ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Metadata de Operación', data: log.metadata })}
                              className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition"
                              title="Ver metadata"
                            >
                              <Eye size={16} />
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              icon={<ChevronLeft size={16} />}
            >
              Anterior
            </Button>

            <span>
              Página <strong className="text-slate-800 font-extrabold">{page}</strong> de <strong className="text-slate-800 font-extrabold">{totalPages}</strong> ({total} eventos)
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              icon={<ChevronRight size={16} />}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>

      {/* JSON Modal */}
      {selectedJson && (
        <div className="modal-overlay" onClick={() => setSelectedJson(null)}>
          <div className="modal-box p-6 space-y-4 max-w-xl text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">{selectedJson.title}</h3>
              <button 
                onClick={() => setSelectedJson(null)}
                className="text-slate-400 hover:text-slate-600 transition font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-xl max-h-[50vh] overflow-y-auto border border-slate-950">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(selectedJson.data, null, 2)}
              </pre>
            </div>
            
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button 
                variant="primary"
                onClick={() => setSelectedJson(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogAuditoria;
