import React, { useEffect, useState, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, AlertTriangle, Info, Eye } from 'lucide-react';
import { getLogsAuditoria, type LogAuditoria as LogType, type FiltrosAuditoria as FiltrosType } from '../../services/auditService';
import FiltrosAuditoria from './FiltrosAuditoria';
import OperacionBadge from './OperacionBadge';
import ExportarAuditoria from './ExportarAuditoria';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

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
    <div className="admin-panel" style={{ padding: '2rem' }}>
      {message && (
        <div 
          className="admin-error-banner" 
          style={{ 
            backgroundColor: message.type === 'success' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid'
          }}
        >
          <Info size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={28} style={{ color: 'var(--color-primary-dark)' }} />
            Log de Auditoría Global
          </h2>
          <p className="text-subtitle" style={{ marginTop: '0.25rem' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p className="text-subtitle" style={{ margin: 0 }}>
          Mostrando {logs.length} de {total} eventos · ordenado desc por timestamp
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge label="Retención: 7 años (RF-21)" variant="neutral" />
        </div>
      </div>

      {error && (
        <div className="admin-error-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="card shadow-sm" style={{ padding: '0', overflow: 'hidden', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '160px' }}>TIMESTAMP</th>
                  <th>USUARIO</th>
                  <th>OPERACIÓN</th>
                  <th>TABLA</th>
                  <th>IP</th>
                  <th style={{ textAlign: 'center' }}>VALOR ANT.</th>
                  <th style={{ textAlign: 'center' }}>VALOR NUEV.</th>
                  <th style={{ textAlign: 'center' }}>METADATA</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-secondary)' }}>
                      No existen registros para los parámetros seleccionados
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const date = new Date(log.timestamp_servidor);
                    const formattedDate = date.toLocaleString('es-PE', { timeZone: 'America/Lima' });

                    return (
                      <tr key={log.id_log}>
                        <td className="admin-td-time" style={{ fontSize: '0.85rem' }}>{formattedDate}</td>
                        <td className="admin-td-email" title={log.email_usuario || ''}>
                          {log.email_usuario || '—'}
                        </td>
                        <td>
                          <OperacionBadge tipo={log.tipo_operacion} />
                        </td>
                        <td>
                          {log.tabla_afectada ? (
                            <code style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.125rem 0.25rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                              {log.tabla_afectada}
                            </code>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          {log.ip_cliente || '—'}
                        </td>
                        
                        <td style={{ textAlign: 'center' }}>
                          {log.valor_anterior ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Valor Anterior', data: log.valor_anterior })}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem', borderRadius: '4px' }}
                              title="Ver valor anterior"
                            >
                              <Eye size={16} style={{ color: 'var(--color-primary)' }} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {log.valor_nuevo ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Valor Nuevo', data: log.valor_nuevo })}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem', borderRadius: '4px' }}
                              title="Ver valor nuevo"
                            >
                              <Eye size={16} style={{ color: 'var(--color-primary)' }} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {log.metadata ? (
                            <button
                              onClick={() => setSelectedJson({ title: 'Metadata de Operación', data: log.metadata })}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '0.25rem', borderRadius: '4px' }}
                              title="Ver metadata"
                            >
                              <Eye size={16} style={{ color: 'var(--color-primary)' }} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 1.5rem', 
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'rgba(0,0,0,0.01)'
          }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>

            <span className="text-subtitle" style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> (Total: {total} eventos)
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* JSON Modal */}
      {selectedJson && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div className="card shadow-md" style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 className="text-h3" style={{ margin: 0, color: 'var(--color-text-primary)' }}>{selectedJson.title}</h3>
              <button 
                onClick={() => setSelectedJson(null)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '1.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1E1E1E', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <pre style={{ margin: 0, color: '#A9DC76', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(selectedJson.data, null, 2)}
              </pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={() => setSelectedJson(null)}
                className="btn btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogAuditoria;
