import { supabase } from './supabase';

export interface LogAuditoria {
  id_log: string;
  id_usuario: string | null;
  email_usuario: string | null;
  tipo_operacion: string;
  tabla_afectada: string | null;
  ip_cliente: string | null;
  valor_anterior: any;
  valor_nuevo: any;
  metadata: any;
  timestamp_servidor: string;
  total_count?: number;
}

export interface FiltrosAuditoria {
  fechaDesde: string;
  fechaHasta: string;
  emailUsuario: string;
  tipoOperacion: string;
}

export async function getLogsAuditoria(
  filtros: FiltrosAuditoria,
  page: number,
  limit: number
): Promise<{ data: LogAuditoria[]; total: number }> {
  const p_desde = filtros.fechaDesde ? new Date(`${filtros.fechaDesde}T00:00:00-05:00`).toISOString() : null;
  const p_hasta = filtros.fechaHasta ? new Date(`${filtros.fechaHasta}T23:59:59-05:00`).toISOString() : null;

  const { data, error } = await (supabase as any).rpc('get_logs_paginados', {
    p_desde,
    p_hasta,
    p_email: filtros.emailUsuario.trim() || null,
    p_tipo: filtros.tipoOperacion === 'Todas' || !filtros.tipoOperacion ? null : filtros.tipoOperacion,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });

  if (error) throw error;

  const logs = (data || []) as any[];
  const total = logs.length > 0 ? Number(logs[0].total_count) : 0;

  return {
    data: logs,
    total,
  };
}

export async function getTiposOperacion(): Promise<string[]> {
  const { data, error } = await supabase
    .from('logs_auditoria')
    .select('tipo_operacion');

  if (error) throw error;

  const types = (data || []).map((d) => d.tipo_operacion);
  return Array.from(new Set(types)).sort();
}

export async function registrarEventoManual(
  tipo: string,
  metadata: Record<string, any>
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;

  const { error } = await supabase.from('logs_auditoria').insert({
    id_usuario: userId,
    email_usuario: email,
    tipo_operacion: tipo,
    metadata,
  });

  if (error) {
    console.error('Error al registrar evento manual de auditoría:', error);
  }
}

export async function exportarLogsCSV(filtros: FiltrosAuditoria): Promise<Blob> {
  const p_desde = filtros.fechaDesde ? new Date(`${filtros.fechaDesde}T00:00:00-05:00`).toISOString() : null;
  const p_hasta = filtros.fechaHasta ? new Date(`${filtros.fechaHasta}T23:59:59-05:00`).toISOString() : null;

  const { data, error } = await (supabase as any).rpc('get_logs_paginados', {
    p_desde,
    p_hasta,
    p_email: filtros.emailUsuario.trim() || null,
    p_tipo: filtros.tipoOperacion === 'Todas' || !filtros.tipoOperacion ? null : filtros.tipoOperacion,
    p_limit: 5000,
    p_offset: 0,
  });

  if (error) throw error;
  const logs = (data || []) as any[];

  const headers = [
    'TIMESTAMP (UTC-5)',
    'USUARIO',
    'OPERACIÓN',
    'TABLA AFECTADA',
    'IP CLIENTE',
    'VALOR ANTERIOR',
    'VALOR NUEVO',
    'METADATA'
  ];

  const rows = logs.map((log) => {
    const date = new Date(log.timestamp_servidor);
    const formattedDate = date.toLocaleString('es-PE', { timeZone: 'America/Lima' });

    return [
      formattedDate,
      log.email_usuario || '—',
      log.tipo_operacion,
      log.tabla_afectada || '—',
      log.ip_cliente || '—',
      log.valor_anterior ? JSON.stringify(log.valor_anterior) : '—',
      log.valor_nuevo ? JSON.stringify(log.valor_nuevo) : '—',
      log.metadata ? JSON.stringify(log.metadata) : '—'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
  ].join('\n');

  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email ?? 'sistema';
  await registrarEventoManual('EXPORT_AUDIT_LOG', {
    filtros_aplicados: filtros,
    total_registros: logs.length,
    exportado_por: email,
  });

  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
}
