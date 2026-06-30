import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  HardDrive,
  Users,
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingUp,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import GraficoTransacciones from './GraficoTransacciones';
import {
  getMetricasGlobales,
  getTransaccionesGrafico,
  getDistribucionRoles,
  getPicosCarga,
  getLogsRecientes,
  type MetricasAdmin,
  type PuntoGrafico,
  type DistribucionRol,
  type PicoCarga,
  type LogReciente,
} from '../../services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatHora(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:00 ${suffix}`;
}

function getBadgeVariant(tipo: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (tipo.includes('FAILED') || tipo.includes('DUPLICATE')) return 'error';
  if (tipo.includes('LOGIN')) return 'success';
  if (tipo.includes('DELETE')) return 'warning';
  return 'neutral';
}

const PanelAdmin: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [grafico, setGrafico] = useState<PuntoGrafico[]>([]);
  const [roles, setRoles] = useState<DistribucionRol[]>([]);
  const [picos, setPicos] = useState<PicoCarga[]>([]);
  const [logs, setLogs] = useState<LogReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, g, r, p, l] = await Promise.all([
        getMetricasGlobales(),
        getTransaccionesGrafico(14),
        getDistribucionRoles(),
        getPicosCarga(),
        getLogsRecientes(10),
      ]);
      setMetricas(m);
      setGrafico(g);
      setRoles(r);
      setPicos(p);
      setLogs(l);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const maxRol = Math.max(...roles.map((r) => r.cantidad), 1);
  const maxPico = Math.max(...picos.map((p) => p.total), 1);

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-panel-header">
        <div>
          <h2 className="text-h2">Consola de Administración</h2>
          <p className="text-subtitle">
            Métricas globales del sistema SRE-URP · Universidad Ricardo Palma
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchAll}
          disabled={loading}
          title="Refrescar datos"
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span style={{ marginLeft: '0.5rem' }}>
            {loading ? 'Actualizando…' : `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`}
          </span>
        </button>
      </div>

      {error && (
        <div className="admin-error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      {loading && !metricas ? (
        <div className="admin-loading-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <StatCard
              label="Transacciones (24h)"
              value={metricas?.transacciones_24h.toLocaleString() ?? '—'}
              icon={<Activity size={22} color="var(--color-accent)" />}
              trend={{ value: 'Últimas 24h', isUpward: true }}
            />
            <StatCard
              label="Almacenamiento Total"
              value={metricas ? formatBytes(metricas.almacenamiento_bytes) : '—'}
              icon={<HardDrive size={22} color="#3B82F6" />}
            />
            <StatCard
              label="Usuarios Activos"
              value={metricas?.usuarios_activos.toLocaleString() ?? '—'}
              icon={<Users size={22} color="var(--color-success)" />}
            />
            <StatCard
              label="Incidencias Críticas (24h)"
              value={metricas?.incidencias_criticas.toLocaleString() ?? '—'}
              icon={<AlertTriangle size={22} color="var(--color-error)" />}
              trend={
                metricas && metricas.incidencias_criticas > 0
                  ? { value: 'Revisar auditoría', isUpward: false }
                  : undefined
              }
            />
          </div>

          {/* Charts Row */}
          <div className="admin-charts-row">
            {/* Transaction Chart */}
            <div className="card admin-chart-card">
              <div className="admin-chart-header">
                <div>
                  <h3 className="text-h3">Volumen de Transacciones</h3>
                  <p className="text-subtitle">Últimos 14 días · desde logs_auditoria</p>
                </div>
                <TrendingUp size={20} color="var(--color-accent)" />
              </div>
              <GraficoTransacciones datos={grafico} dias={14} />
            </div>

            {/* Side column */}
            <div className="admin-side-col">
              {/* Distribución por rol */}
              <div className="card admin-side-card">
                <h3 className="text-h3" style={{ marginBottom: '1rem' }}>
                  Distribución por Rol
                </h3>
                {roles.length === 0 ? (
                  <p className="text-subtitle">Sin datos</p>
                ) : (
                  <div className="distribucion-roles">
                    {roles.map((r) => (
                      <div key={r.nombre} className="distribucion-item">
                        <div className="distribucion-label">
                          <span className="distribucion-nombre">{r.nombre}</span>
                          <span className="distribucion-count">{r.cantidad}</span>
                        </div>
                        <div className="distribucion-bar-track">
                          <div
                            className="distribucion-bar-fill"
                            style={{ width: `${(r.cantidad / maxRol) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pico de carga */}
              <div className="card admin-side-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Clock size={16} color="var(--color-warning)" />
                  <h3 className="text-h3">Pico de Carga (7d)</h3>
                </div>
                {picos.length === 0 ? (
                  <p className="text-subtitle">Sin datos suficientes</p>
                ) : (
                  <div className="picos-carga">
                    {picos.slice(0, 4).map((p) => (
                      <div key={p.hora} className="pico-item">
                        <div className="pico-label">
                          <span className="pico-hora">{formatHora(p.hora)}</span>
                          <span className="pico-total">{p.total} ops</span>
                        </div>
                        <div className="distribucion-bar-track">
                          <div
                            className="distribucion-bar-fill pico-bar"
                            style={{ width: `${(p.total / maxPico) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="admin-table-header">
              <div>
                <h3 className="text-h3">Log de Auditoría Reciente</h3>
                <p className="text-subtitle">Últimas 10 operaciones del sistema</p>
              </div>
              <a href="/admin/auditoria" className="btn btn-ghost btn-sm">
                Ver todo →
              </a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>USUARIO</th>
                    <th>OPERACIÓN</th>
                    <th>TABLA</th>
                    <th>IP</th>
                    <th>CUANDO</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                        Sin registros de auditoría
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id_log}>
                        <td className="admin-td-email">{log.email_usuario ?? '—'}</td>
                        <td>
                          <Badge
                            label={log.tipo_operacion}
                            variant={getBadgeVariant(log.tipo_operacion)}
                          />
                        </td>
                        <td>{log.tabla_afectada ?? '—'}</td>
                        <td>{log.ip_cliente ?? '—'}</td>
                        <td className="admin-td-time">
                          {formatDistanceToNow(new Date(log.timestamp_servidor), {
                            locale: es,
                            addSuffix: true,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PanelAdmin;
