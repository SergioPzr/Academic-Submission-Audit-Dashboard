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
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Consola de Administración</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Métricas globales de infraestructura y auditoría del sistema SRE-URP
          </p>
        </div>
        
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
          onClick={fetchAll}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>
            {loading ? 'Actualizando…' : `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle size={16} className="text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && !metricas ? (
        <div className="flex justify-center items-center h-96">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label="Transacciones (24h)"
              value={metricas?.transacciones_24h.toLocaleString() ?? '—'}
              icon={<Activity size={22} className="text-emerald-500" />}
              trend={{ value: 'Operaciones de auditoría', isUpward: true }}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
            />
            <StatCard
              label="Espacio de Storage"
              value={metricas ? formatBytes(metricas.almacenamiento_bytes) : '—'}
              icon={<HardDrive size={22} className="text-blue-500" />}
              trend={{ value: 'Bucket de entregas', isUpward: true }}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
            />
            <StatCard
              label="Usuarios Activos"
              value={metricas?.usuarios_activos.toLocaleString() ?? '—'}
              icon={<Users size={22} className="text-emerald-700" />}
              trend={{ value: 'Cuentas habilitadas', isUpward: true }}
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
            />
            <StatCard
              label="Incidencias (24h)"
              value={metricas?.incidencias_criticas.toLocaleString() ?? '—'}
              icon={<AlertTriangle size={22} className="text-red-500" />}
              trend={
                metricas && metricas.incidencias_criticas > 0
                  ? { value: 'Acción requerida', isUpward: false }
                  : { value: 'Sin incidencias', isUpward: true }
              }
              className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
            />
          </div>

          {/* Charts & Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Transaction Chart Card */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Volumen de Actividad</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Historial de logs de auditoría (14 días)</p>
                </div>
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              
              <div className="w-full">
                <GraficoTransacciones datos={grafico} dias={14} />
              </div>
            </div>

            {/* Right Column (Sidebar metrics) */}
            <div className="flex flex-col gap-6">
              
              {/* Role Distribution Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-3">
                  Distribución de Usuarios
                </h3>
                {roles.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold py-4 text-center">Sin datos de usuarios</p>
                ) : (
                  <div className="space-y-4">
                    {roles.map((r) => (
                      <div key={r.nombre} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-700 capitalize">{r.nombre}</span>
                          <span className="text-slate-500">{r.cantidad}</span>
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

              {/* Load Peaks Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <Clock size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">Picos de Carga (7d)</h3>
                </div>
                {picos.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold py-4 text-center">Sin datos suficientes</p>
                ) : (
                  <div className="space-y-4">
                    {picos.slice(0, 4).map((p) => (
                      <div key={p.hora} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-700">{formatHora(p.hora)}</span>
                          <span className="text-slate-500">{p.total} operaciones</span>
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

          {/* Recent Audit Logs Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Auditoría en Tiempo Real</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Últimas 10 operaciones críticas del sistema</p>
              </div>
              <a href="/admin/auditoria" className="text-xs font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition">
                Ver todo log →
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Operación</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Tabla</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Dirección IP</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">
                        Sin registros de auditoría
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id_log} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700 max-w-[200px] truncate">{log.email_usuario ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            label={log.tipo_operacion}
                            variant={getBadgeVariant(log.tipo_operacion)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{log.tabla_afectada ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">{log.ip_cliente ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-semibold">
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
